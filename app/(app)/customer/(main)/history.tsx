import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { fetchOrders, type OrderResponse } from '@/api/orders';
import { copy, serviceTitle } from '@/copy/uk';
import { formatUah } from '@/format/money';
import { isOpenOrderStatus, orderStatusLabel } from '@/orders/status';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import {
  AppText,
  EmptyState,
  ErrorBanner,
  LoadingState,
  OrderCard,
  PressScale,
  Screen,
  orderStatusTone,
  userFacingError,
} from '@/ui';

export default function CustomerHistoryScreen() {
  const { authed } = useSession();
  const [items, setItems] = useState<OrderResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    try {
      const response = await authed((token) => fetchOrders(token));
      setItems(response.items);
      setError(null);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  }, [authed]);

  useFocusEffect(
    useCallback(() => {
      setBusy(true);
      void load();
    }, [load]),
  );

  const visible = useMemo(
    () => items.filter((order) => (tab === 'active' ? isOpenOrderStatus(order.status) : !isOpenOrderStatus(order.status))),
    [items, tab],
  );

  return (
    <Screen scroll embedInTabs>
      <AppText variant="hero">{copy.myOrders}</AppText>
      <View style={styles.tabs}>
        <PressScale
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'active' }}
          onPress={() => setTab('active')}
          style={[styles.tab, tab === 'active' && styles.tabOn]}
        >
          <AppText variant="label" color={tab === 'active' ? colors.accent : colors.secondary} numberOfLines={1}>
            {copy.ordersActive}
          </AppText>
        </PressScale>
        <PressScale
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'history' }}
          onPress={() => setTab('history')}
          style={[styles.tab, tab === 'history' && styles.tabOn]}
        >
          <AppText variant="label" color={tab === 'history' ? colors.accent : colors.secondary} numberOfLines={1}>
            {copy.ordersHistory}
          </AppText>
        </PressScale>
      </View>

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setBusy(true);
            void load();
          }}
        />
      ) : null}

      {busy ? <LoadingState /> : null}

      {!busy && visible.length === 0 && !error ? (
        <EmptyState
          title={tab === 'active' ? copy.noOrdersTitle : copy.historyEmptyTitle}
          hint={copy.ordersWillAppear}
          actionLabel={copy.orderHelpCta}
          onAction={() => router.navigate('/customer')}
        />
      ) : null}

      <View style={styles.list}>
        {visible.map((order) => (
          <OrderCard
            key={order.id}
            serviceKey={order.serviceKey}
            title={serviceTitle(order.serviceKey)}
            date={new Date(order.createdAt).toLocaleString('uk-UA', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
            status={orderStatusLabel(order.status)}
            tone={orderStatusTone(order.status)}
            price={formatUah(order.amountKopiyky)}
            onPress={() =>
              router.push({
                pathname: '/customer/order/[id]',
                params: { id: order.id },
              })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xl,
    marginBottom: space.xl,
  },
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentWash,
  },
  list: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
});
