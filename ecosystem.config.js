module.exports = {
  apps : [{
    script: 'src/server.js',
    watch: '.'
  }, {
    script: './service-worker/',
    watch: ['./service-worker']
  }]
};
