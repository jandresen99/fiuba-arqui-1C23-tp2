export default {
  // Flag to determine whether to log debug information or not
  debug: true,

  // Base uri for remote GUIDs service
  remoteGuidsUri: 'http://10.0.4.4:8888',

  // Redis client
  redis: {
    host: 'nodecacheredishasbullafdsfhsdfiubvro.redis.cache.windows.net',
    port: '6379',
    password: 'IOUspbUFGcoaVNoUCvkqOHpIAUDJwoU5eAzCaC6affo='
  },

  datadog: {
    'response_code': true,
    'tags':          ['app:node']
  },
};
