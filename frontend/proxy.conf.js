const target = process.env.BACKEND_URL || 'http://localhost:8081';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
