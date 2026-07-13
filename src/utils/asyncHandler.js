// Envuelve un controller async para que sus rechazos lleguen al error handler de Express.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
