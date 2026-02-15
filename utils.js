function bq(text, max = 600) {
  if (!text) return '';
  let t = String(text).replace(/\r\n?/g, '\n');
  if (t.length > max) t = t.slice(0, max) + '...';
  return '> ' + t.split('\n').join('\n> ');
}

module.exports = { bq };
