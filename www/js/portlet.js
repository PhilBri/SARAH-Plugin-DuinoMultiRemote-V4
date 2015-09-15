!function ($) {
   var duinobleu = '#33A3EC', sendDuino, tab = {};
   $('#DuinoMultiRemote > .portlet-header').append('<img id="logo" src="/duinomultiremote/www/images/duinologowhite.png"/>');
   // ------------------------------------------
   // REGISTER
   // ------------------------------------------
   var register = function() {
      // socketIo
      var socket = io.connect('http://localhost:11223')
      .on('connect', function () { socket.emit('sendDuino', '?\n') })
      .on('portlet', function(data) {
         // Buttons & sliders
         for (var key in tab=data) $('#'+key).text(key.match(/state/) ?  tab[key]=='0' ? 'OFF' : 'ON' : tab[key]);
         // Switch
         $('#swt_state').text()=='OFF' ? 
            $('#led_state, #rgb_state').attr('disabled','disabled').css({ 'background':'transparent', 'color':'grey', 'border-color':'grey'}) :
            $('#led_state, #rgb_state').removeAttr('disabled').css({ 'background': duinobleu, 'color':'#FFF', 'border-color':duinobleu });
         // Colorpicker
         $('#rgb-color').spectrum( "set", 'rgb('+$('#red_val').text()+','+$('#green_val').text()+','+$('#blue_val').text()+')' );
      })
      .on('disconnect', function(){console.log('déconnecté du serveur !')});
      // Events
      $(document).click( function (event) {
         if ($(event.target).attr('id')) {
            event.preventDefault();
            $.post('http://127.0.0.1:8080/sarah/DuinoMultiRemote/?cmd='+$(event.target).attr('id'));
         }
      });
      // Spectrum
      $('#rgb-color').spectrum ({
         preferredFormat: 'rgb',
         showPalette: true,
         palette: [],
         showInput: true,
         maxSelectionSize: 5,
         hideAfterPaletteSelect: true,
         change: function (color) {
            var rgbColor = color.toString().match(/\d+/g);
            socket.emit( 'sendDuino', 'R' + rgbColor[0] +','+ rgbColor[1] +','+ rgbColor[2] +','+ tab.rgb_state +'\n' );
         }
      });
   }
   // ------------------------------------------
   // PUBLIC
   // ------------------------------------------
   $(document).ready(function() {
      register();
   });
} (jQuery);
