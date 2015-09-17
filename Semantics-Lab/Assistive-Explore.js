

(function() {
  var FALSE, HOVER, KEY;
  MathJax.Hub.Register.StartupHook("MathEvents Ready",function () {
    FALSE = MathJax.Extension.MathEvents.Event.False;
    HOVER = MathJax.Extension.MathEvents.Hover;
    KEY = MathJax.Extension.MathEvents.Event.KEY;
  });
  var Explorer = MathJax.Extension.Explorer = {
    enriched: [],
    active: [],
    speechDiv: null,
    Register: function(jax, id, script) {
      if (jax.enriched) {
        Explorer.enriched.push(jax);
      };
    },
    AddEvents: function() {
      for (var i = 0, jax; jax = Explorer.enriched[i]; i++) {
        // This is costly! Can I do this also from the script?
        var frame = document.getElementById(jax.inputID + '-Frame');
        if (frame) {
          Explorer.AddEvent(frame);
          Explorer.active.push(jax);
        }
      }
      if (Explorer.enriched.length !== Explorer.active.length) {
          MathJax.Hub.Queue(["AddEvents", Explorer]);
      }
    },
    AddEvent: function(element) {
      element.onkeydown = Explorer.Keydown;
    },
    Keydown: function (event) {
      if (event.keyCode === KEY.SPACE) {
        var math = event.target;
        if (event.shiftKey) {
          Explorer.AddSpeech(math);
          var speechNode = math.querySelector('span[data-semantic-speech]');
          Explorer.Speak(speechNode.getAttribute('data-semantic-speech'));
        } else {
          MathJax.Extension.MathEvents.Event.ContextMenu(event, math);
        }
      } else if (event.keyCode === KEY.ESCAPE) {
        Explorer.RemoveSpeech();
      }
      FALSE(event);
    },
    AddSpeech: function(math) {
      if (!Explorer.speechDiv) {
        Explorer.speechDiv = MathJax.HTML.addElement(
          document.body, "div", {className:"MathJax_SpeechOutput",
                                 style: {fontSize: '1px', color: '#FFFFFF'}});
        Explorer.speechDiv.setAttribute('aria-live', 'assertive');
      }
    },
    RemoveSpeech: function() {
      if (Explorer.speechDiv) {
        Explorer.speechDiv.parentNode.removeChild(Explorer.speechDiv);
      }
      Explorer.speechDiv = null;
    },
    Speak: function(speech) {
      Explorer.speechDiv.textContent = speech;
    },
    GetRoot: function(math) {
      var speechNodes = math.querySelectorAll('span[data-semantic-speech]');
      var parent = speechNodes.find(function(x) {
          return !x.hasAttribute('data-semantic-parent');});
    }
  };
  
  MathJax.Hub.postInputHooks.Add(["Register", Explorer], 200);

  MathJax.Hub.Register.MessageHook("End Math",
                                   ["AddEvents", MathJax.Extension.Explorer]);

})();