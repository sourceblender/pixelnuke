import path from 'path';

module.exports = (app) => {
  // Insert routes below
  app.use('/api/things', require('./api/thing'));
  app.use('/api/users', require('./api/user'));

  app.use('/auth', require('./api/auth'));

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get((req, res) => {
      res.sendFile(path.join(__dirname, '/templates/error404.html'));
    });

  // All other routes should redirect to the index.html
  app.route('/*')
    .get((req, res) => {
      res.sendFile(path.join(__dirname, '/templates/index.html'));
    });
};