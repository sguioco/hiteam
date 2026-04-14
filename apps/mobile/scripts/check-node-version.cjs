function warnIfUnsupportedNode() {
  const major = Number(process.versions.node.split('.')[0] || 0);

  if (major >= 24) {
    console.warn(
      [
        '',
        '[smart/mobile] Обнаружен Node ' + process.versions.node + '.',
        'Expo SDK 54 в этом проекте может нестабильно стартовать на Node 24 и падать с `TypeError: fetch failed`.',
        'Рекомендуемый диапазон для локальной разработки: Node 20 LTS или 22 LTS.',
        'Временный обход уже включён: `expo start --offline`.',
        '',
      ].join('\n'),
    );
  }
}

if (require.main === module) {
  warnIfUnsupportedNode();
}

module.exports = {
  warnIfUnsupportedNode,
};
