export default ($stateProvider) => {
  $stateProvider
    .state('admin', {
      url: '/admin',
      template: require('./admin.jade'),
      controller: 'AdminCtrl',
    });
};
