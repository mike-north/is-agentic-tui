const keys = Object.keys(process.env)
  .filter(k => /CURSOR|AGENT/i.test(k))
  .sort();
console.log(keys.length ? keys.join('\n') : 'No matching variables found');
