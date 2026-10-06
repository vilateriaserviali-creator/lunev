(() => {
  const originalCreateClient = window.supabase?.createClient;
  if (typeof originalCreateClient !== "function") return;

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient.apply(this, args);
    const originalChannel = client.channel.bind(client);

    client.channel = function (name, options = {}) {
      const nextOptions = {
        ...options,
        config: {
          ...(options.config || {}),
          private: true,
          presence: {
            enabled: true,
            ...((options.config || {}).presence || {})
          },
          broadcast: {
            self: false,
            ack: true,
            ...((options.config || {}).broadcast || {})
          }
        }
      };
      return originalChannel(name, nextOptions);
    };

    return client;
  };
})();
