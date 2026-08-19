const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);
const nestApiRoot = path.resolve(projectRoot, 'api');
const nestApiBlock = new RegExp(
  `^${nestApiRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\]`,
);

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  nestApiBlock,
];

module.exports = config;
