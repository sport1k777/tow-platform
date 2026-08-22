import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { createOrder } from '@/api/orders';
import { createQuote, type QuoteResponse } from '@/api/quotes';
import { BookingSummary, type SummaryRow } from '@/booking/BookingSummary';
import { ChoiceList } from '@/booking/ChoiceList';
import { detailsCopy, destinationRequiredFor } from '@/booking/flow';
import {
  cargoClassLabel,
  cargoClasses,
  cargoKindLabel,
  cargoKinds,
  evacuatorVehicleLabel,
  evacuatorVehicles,
  moverCountLabel,
  moverCounts,
  movingVolumeLabel,
  movingVolumes,
  movingWhatLabel,
  movingWhats,
  roadsideProblemLabel,
  roadsideProblems,
  toApiVehicle,
  yesNo,
  yesNoLabel,
  type CargoClass,
  type CargoKind,
  type EvacuatorVehicle,
  type MoverCount,
  type MovingVolume,
  type MovingWhat,
  type RoadsideProblem,
  type YesNo,
} from '@/booking/options';
import { PaymentFields } from '@/booking/PaymentFields';
import { bookingTypeForService } from '@/booking/serviceType';
import { isServiceKey } from '@/config/services';
import {
  confirmOrderLabel,
  copy,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/copy/uk';
import { formatDistanceKm, formatEta, formatUah } from '@/format/money';
import { mapProvider } from '@/maps/provider';
import { firstParam, parsePlaceParam } from '@/navigation/params';
import { paymentProvider } from '@/payments/create-payment-provider';
import type { PaymentMethod } from '@/payments/types';
import { useSession } from '@/session';
import { colors, space } from '@/theme';
import { AppText, Button, NavBack, Screen, TextField, userFacingError } from '@/ui';

function isCargoKind(value: string | undefined): value is CargoKind {
  return cargoKinds.includes(value as CargoKind);
}

export default function CustomerDetailsScreen() {
  const params = useLocalSearchParams<{
    service?: string;
    pickup?: string;
    destination?: string;
    cargoKind?: string;
  }>();
  const { authed } = useSession();
  const serviceKey = isServiceKey(params.service) ? params.service : 'tow';
  const bookingType = bookingTypeForService(serviceKey);
  const heading = detailsCopy(bookingType);
  const pickup = useMemo(() => parsePlaceParam(params.pickup), [params.pickup]);
  const destination = useMemo(
    () => parsePlaceParam(params.destination),
    [params.destination],
  );
  const destinationRequired = destinationRequiredFor(bookingType);
  const rawCargo = firstParam(params.cargoKind);
  const cargoFromRoute = isCargoKind(rawCargo) ? rawCargo : null;

  const [vehicle, setVehicle] = useState<EvacuatorVehicle | null>(null);
  const [cargoKind, setCargoKind] = useState<CargoKind | null>(cargoFromRoute);
  const [cargoClass, setCargoClass] = useState<CargoClass | null>(null);
  const [movingWhat, setMovingWhat] = useState<MovingWhat | null>(null);
  const [movingVolume, setMovingVolume] = useState<MovingVolume | null>(null);
  const [movers, setMovers] = useState<YesNo | null>(null);
  const [moverCount, setMoverCount] = useState<MoverCount>(2);
  const [lift, setLift] = useState<YesNo | null>(null);
  const [floor, setFloor] = useState('');
  const [blockedWheels, setBlockedWheels] = useState<YesNo | null>(null);
  const [accident, setAccident] = useState<YesNo | null>(null);
  const [roadProblem, setRoadProblem] = useState<RoadsideProblem | null>(null);
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readyForQuote =
    Boolean(pickup) &&
    (!destinationRequired || Boolean(destination)) &&
    (bookingType === 'EVACUATOR'
      ? Boolean(vehicle)
      : bookingType === 'TRANSPORT'
        ? Boolean(cargoKind && cargoClass)
        : bookingType === 'MOVING'
          ? Boolean(movingWhat && movingVolume && movers && lift)
          : Boolean(roadProblem));

  const detailsPayload = useMemo(() => {
    const payload: Record<string, unknown> = {
      serviceType: bookingType,
    };
    if (pickup?.source) {
      payload.pickupSource = pickup.source;
    }
    if (notes.trim()) {
      payload.notes = notes.trim();
    }
    if (bookingType === 'EVACUATOR' && vehicle) {
      payload.towVehicle = vehicle;
      if (blockedWheels) {
        payload.blockedWheels = blockedWheels === 'yes';
      }
      if (accident) {
        payload.accident = accident === 'yes';
      }
    }
    if (bookingType === 'TRANSPORT') {
      if (cargoKind) {
        payload.cargoKind = cargoKind;
      }
      if (cargoClass) {
        payload.cargoClass = cargoClass;
      }
    }
    if (bookingType === 'MOVING') {
      if (movingWhat) {
        payload.movingWhat = movingWhat;
      }
      if (movingVolume) {
        payload.movingVolume = movingVolume;
      }
      if (movers) {
        payload.movers = movers === 'yes';
        if (movers === 'yes') {
          payload.moverCount = moverCount;
        }
      }
      if (lift) {
        payload.lift = lift === 'yes';
      }
      if (floor.trim()) {
        payload.floor = Number.parseInt(floor.trim(), 10) || floor.trim();
      }
    }
    if (bookingType === 'ROAD_ASSISTANCE' && roadProblem) {
      payload.roadsideProblem = roadProblem;
    }
    return payload;
  }, [
    bookingType,
    accident,
    blockedWheels,
    cargoClass,
    cargoKind,
    floor,
    lift,
    moverCount,
    movers,
    movingVolume,
    movingWhat,
    notes,
    pickup,
    roadProblem,
    vehicle,
  ]);

  useEffect(() => {
    if (!readyForQuote || !pickup) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      setError(null);
      void authed((token) =>
        createQuote(
          {
            serviceKey,
            pickup,
            destination: destination ?? undefined,
            vehicleCategory: toApiVehicle(vehicle),
            details: detailsPayload,
          },
          token,
        ),
      )
        .then((next) => {
          if (!cancelled) {
            setQuote(next);
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setQuote(null);
            setError(userFacingError(caught));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setBusy(false);
          }
        });
    },     notes.trim() ? 400 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authed, destination, detailsPayload, notes, pickup, readyForQuote, serviceKey, vehicle]);

  async function onConfirmOrder() {
    if (!quote) {
      return;
    }
    if (!paymentMethod) {
      setError(copy.paymentRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const checkout = await paymentProvider.checkout({
        method: paymentMethod,
        amountKopiyky: quote.amountKopiyky,
        currency: quote.currency,
      });
      const order = await authed((token) =>
        createOrder(quote.id, token, checkout.method),
      );
      router.replace({
        pathname: '/customer/order/[id]',
        params: { id: order.id },
      });
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }

  const summaryRows = useMemo((): SummaryRow[] => {
    const rows: SummaryRow[] = [];
    if (pickup) {
      rows.push({ label: copy.pickupLabel, value: pickup.label });
    }
    if (destination) {
      rows.push({ label: copy.destinationLabel, value: destination.label });
    }
    if (bookingType === 'TRANSPORT' && cargoKind) {
      rows.push({ label: copy.cargoKindLabel, value: cargoKindLabel(cargoKind) });
    }
    if (bookingType === 'MOVING' && movingWhat) {
      rows.push({ label: copy.movingWhatLabel, value: movingWhatLabel(movingWhat) });
    }
    if (notes.trim()) {
      rows.push({ label: copy.summaryNotes, value: notes.trim() });
    }
    if (quote) {
      if (quote.breakdown?.lines.length) {
        rows.push({ label: copy.quotePriceTitle, value: '' });
        for (const item of quote.breakdown.lines) {
          rows.push({
            label: item.label,
            value: formatUah(item.amountKopiyky),
            emphasize: item.code === 'total',
          });
        }
      } else {
        if (quote.distanceMeters > 0) {
          rows.push({ label: copy.distanceLabel, value: formatDistanceKm(quote.distanceMeters) });
        }
        if (quote.durationSeconds > 0) {
          rows.push({ label: copy.etaLabel, value: formatEta(quote.durationSeconds) });
        }
        rows.push({
          label: copy.estimatedPriceLabel,
          value: formatUah(quote.amountKopiyky),
          emphasize: true,
        });
      }
      if (paymentMethod) {
        rows.push({
          label: copy.paymentTitle,
          value: `${paymentMethodLabel(paymentMethod)}${
            paymentProvider.mock
              ? ` · ${paymentStatusLabel(paymentMethod === 'cash' ? 'cash' : 'mock_authorized')}`
              : ''
          }`,
        });
      }
    }
    return rows;
  }, [
    bookingType,
    cargoKind,
    destination,
    movingWhat,
    notes,
    paymentMethod,
    pickup,
    quote,
  ]);

  return (
    <Screen
      keyboard
      scroll
      footer={
        quote ? (
          <View style={styles.footer}>
            <Button
              label={confirmOrderLabel(quote.amountKopiyky)}
              loading={busy}
              disabled={busy || !paymentMethod}
              onPress={() => void onConfirmOrder()}
            />
          </View>
        ) : null
      }
    >
      <NavBack />
      <AppText variant="hero">{heading.title}</AppText>
      <AppText variant="body" color={colors.muted} style={styles.subtitle}>
        {heading.subtitle}
      </AppText>
      {mapProvider.mock ? (
        <AppText variant="caption" color={colors.warning} style={styles.devBanner}>
          {copy.devQuoteBanner}
        </AppText>
      ) : null}

      {bookingType === 'EVACUATOR' ? (
        <>
          <ChoiceList
            options={evacuatorVehicles.map((value) => ({
              value,
              label: evacuatorVehicleLabel(value),
            }))}
            value={vehicle}
            onChange={(value) => {
              setVehicle(value);
              setQuote(null);
              setBusy(true);
            }}
          />
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.blockedWheelsLabel}
          </AppText>
          <ChoiceList
            options={yesNo.map((value) => ({ value, label: yesNoLabel(value) }))}
            value={blockedWheels}
            onChange={(value) => {
              setBlockedWheels(value);
              setQuote(null);
            }}
          />
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.accidentLabel}
          </AppText>
          <ChoiceList
            options={yesNo.map((value) => ({ value, label: yesNoLabel(value) }))}
            value={accident}
            onChange={(value) => {
              setAccident(value);
              setQuote(null);
            }}
          />
        </>
      ) : null}

      {bookingType === 'TRANSPORT' ? (
        <>
          {!cargoFromRoute ? (
            <ChoiceList
              options={cargoKinds.map((value) => ({ value, label: cargoKindLabel(value) }))}
              value={cargoKind}
              onChange={(value) => {
                setCargoKind(value);
                setQuote(null);
                setBusy(true);
              }}
            />
          ) : null}
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.cargoClassLabel}
          </AppText>
          <ChoiceList
            options={cargoClasses.map((value) => ({ value, label: cargoClassLabel(value) }))}
            value={cargoClass}
            onChange={(value) => {
              setCargoClass(value);
              setQuote(null);
              setBusy(true);
            }}
          />
        </>
      ) : null}

      {bookingType === 'MOVING' ? (
        <>
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.movingWhatLabel}
          </AppText>
          <ChoiceList
            options={movingWhats.map((value) => ({ value, label: movingWhatLabel(value) }))}
            value={movingWhat}
            onChange={(value) => {
              setMovingWhat(value);
              setQuote(null);
            }}
          />
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.movingVolumeLabel}
          </AppText>
          <ChoiceList
            options={movingVolumes.map((value) => ({ value, label: movingVolumeLabel(value) }))}
            value={movingVolume}
            onChange={setMovingVolume}
          />
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.movingMoversLabel}
          </AppText>
          <ChoiceList
            options={yesNo.map((value) => ({ value, label: yesNoLabel(value) }))}
            value={movers}
            onChange={(value) => {
              setMovers(value);
              setQuote(null);
            }}
          />
          {movers === 'yes' ? (
            <>
              <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
                {copy.moversCountLabel}
              </AppText>
              <ChoiceList
                options={moverCounts.map((value) => ({
                  value: String(value),
                  label: moverCountLabel(value),
                }))}
                value={String(moverCount)}
                onChange={(value) => {
                  setMoverCount(Number(value) === 4 ? 4 : 2);
                  setQuote(null);
                }}
              />
            </>
          ) : null}
          <AppText variant="caption" color={colors.muted} style={styles.fieldLabel}>
            {copy.movingLiftLabel}
          </AppText>
          <ChoiceList
            options={yesNo.map((value) => ({ value, label: yesNoLabel(value) }))}
            value={lift}
            onChange={setLift}
          />
          <TextField
            accessibilityLabel={copy.movingFloorPlaceholder}
            placeholder={copy.movingFloorPlaceholder}
            value={floor}
            onChangeText={setFloor}
            keyboardType="number-pad"
            style={styles.floor}
          />
        </>
      ) : null}

      {bookingType === 'ROAD_ASSISTANCE' ? (
        <ChoiceList
          options={roadsideProblems.map((value) => ({
            value,
            label: roadsideProblemLabel(value),
          }))}
          value={roadProblem}
          onChange={(value) => {
            setRoadProblem(value);
            setQuote(null);
            setBusy(true);
          }}
        />
      ) : null}

      <TextField
        accessibilityLabel={copy.notesPlaceholder}
        multiline
        placeholder={copy.notesPlaceholder}
        value={notes}
        onChangeText={setNotes}
        style={styles.notes}
      />

      {readyForQuote ? (
        summaryRows.length > 0 ? (
          <BookingSummary rows={summaryRows} />
        ) : (
          <AppText variant="caption" color={colors.muted} style={styles.loading}>
            {copy.loading}
          </AppText>
        )
      ) : null}

      {quote ? <PaymentFields value={paymentMethod} onChange={setPaymentMethod} /> : null}

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
  devBanner: {
    marginTop: -space.md,
    marginBottom: space.lg,
  },
  fieldLabel: {
    marginBottom: space.sm,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  floor: {
    marginBottom: space.lg,
  },
  loading: {
    marginTop: space.lg,
  },
  error: {
    marginTop: space.md,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
