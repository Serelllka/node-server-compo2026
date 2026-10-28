function task(x) {
  return x >= 18
    ? Promise.reject('no')
    : Promise.resolve(x == 0 ? 'serelllka' : 'yes');
}
