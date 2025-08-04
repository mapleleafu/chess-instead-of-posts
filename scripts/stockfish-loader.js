console.log('stockfish-loader: Script loaded');
console.log('stockfish-loader: module.exports available:', typeof window.module.exports);
console.log('stockfish-loader: module.exports content:', window.module.exports);
console.log('stockfish-loader: module.exports keys:', Object.keys(window.module.exports || {}));

if (typeof window.module !== 'undefined' && window.module.exports) {
  
  // Check if there's a function in the exports
  const possibleFunctions = Object.keys(window.module.exports).filter(key => 
    typeof window.module.exports[key] === 'function'
  );
  console.log('stockfish-loader: Available functions:', possibleFunctions);
  
  window.Stockfish = function() {
    console.log('stockfish-loader: Creating direct Stockfish instance');
    
    try {
      let stockfishFactory = null;
      
      // Try different ways to get the stockfish function
      if (typeof window.module.exports === 'function') {
        stockfishFactory = window.module.exports;
      } else if (window.module.exports.Stockfish) {
        stockfishFactory = window.module.exports.Stockfish;
      } else if (window.module.exports.default) {
        stockfishFactory = window.module.exports.default;
      } else {
        console.log('❌ No stockfish factory function found');
        return null;
      }
      
      console.log('stockfish-loader: Using factory:', typeof stockfishFactory);
      
      // Configure stockfish for the extension environment
      const config = {
        locateFile: function(file) {
          console.log('stockfish-loader: Looking for file:', file);
          if (file.endsWith('.wasm')) {
            return chrome.runtime.getURL('libs/stockfish.wasm');
          }
          return file;
        },
        print: function(message) {
          console.log('🎯 Stockfish output:', message);
          // Forward messages to background
          chrome.runtime.sendMessage({
            type: "STOCKFISH_MESSAGE",
            message: message.trim()
          }).catch(err => console.log('Send error:', err));
        },
        printErr: function(message) {
          console.log('🚨 Stockfish error:', message);
        }
      };
      
      console.log('stockfish-loader: Calling stockfish factory with config');
      const instance = stockfishFactory(config);
      
      console.log('stockfish-loader: Instance created:', typeof instance);
      
      // Return wrapper with expected API  
      return {
        postMessage: function(cmd) {
          console.log('📤 Sending command:', cmd);
          if (instance && instance.ccall) {
            try {
              instance.ccall('command', null, ['string'], [cmd]);
            } catch (e) {
              console.log('❌ Command error:', e);
            }
          } else {
            console.log('❌ Instance not ready, checking:', {
              instance: typeof instance,
              ccall: instance ? typeof instance.ccall : 'no instance'
            });
          }
        },
        addMessageListener: function(callback) {
          console.log('📻 Message listener added (messages go via print function)');
        }
      };
      
    } catch (error) {
      console.log('❌ Direct stockfish creation failed:', error);
      return null;
    }
  };
} else {
  console.log('❌ module.exports not available');
}