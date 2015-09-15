var settings = require( './settings.json' ), tab = settings.tab, duinoSerial;

exports.action = function ( data, next ) {
    if ( !duinoSerial ) error ( settings.errs.serialClose );
    else {
        duinoAction( data, next, function ( clbk ) { next ( duinoSerial.write( clbk ) ) });
        info ( '\x1b[96mDuinoMultiRemote: ', ( data.text  ?  data.text : 'from Portlet or HTTP ...') + '\x1b[0m' );
    }
}

exports.init = function() {
    info ( '\x1b[96mDuinoMultiRemote is initializing ... \x1b[0m' );
    setLibs();
}

exports.dispose = function () {
    info ( '\x1b[96mDuinoMultiRemote is disposed ...\x1b[0m' );
}

// Decoding Arduino's datas
var decodeDuinoData = function ( serialData, decodedData ) {
    var s = serialData.match( /\d+/g );
    for ( var key in tab ) tab[key] = s.shift();
    writeJSON ( tab );
    decodedData ( tab );
}

// Writing values.ejs
var writeJSON = function ( tab ) {
    var fs = require( 'fs' ),
        file = __dirname + '\\values.ejs';
    fs.writeFileSync ( file, JSON.stringify( tab ), 'utf8' );
}

// Setting libs
var setLibs = function () {
    var port = Config.modules.DuinoMultiRemote.Port;
    var serial = require( 'serialport' );
    if ( !port ) error ( settings.errs.port + port );
    if ( !SARAH.context.DuinoMultiRemote ) SARAH.context.DuinoMultiRemote = { 'IO' : require( 'socket.io' )( 11223 ) };

    duinoSerial = new serial.SerialPort ( port, { baudrate: 9600, parser: serial.parsers.readline( '\n' ) }, false );

    if ( !duinoSerial.isOpen() ) duinoSerial.open( function ( err ) {
        if ( !err ) {
            info ( settings.errs.serialOpen + port );
            setSocket();
            duinoSerial.write( '?\n' );
        } else error ( settings.errs.name + err );
    });

    duinoSerial.on ( 'data', function ( serialData ) {
        decodeDuinoData ( serialData, function ( decodedData ) { SARAH.context.DuinoMultiRemote.IO.sockets.emit( 'portlet', decodedData ) });
    });
}

// Setting socket.io
var setSocket = function () {
    SARAH.context.DuinoMultiRemote.IO.sockets.on ( 'connect', function ( socket ) {
        info ( settings.errs.connect );
        socket.on ( 'disconnect', function () { info ( settings.errs.disconnect ) })
        .on ( 'sendDuino', function ( sendDuino ) { duinoSerial.write( sendDuino ) });
    });
}

// Action Commands
var duinoAction = function ( data, next, clbk ) {
    var dataSender = data.cmd.split( '_' )[0], duinoCmd = data.cmd.split( '_' )[1]; // datas 
    var duinoState = tab[dataSender+'_state'], duinoVal = tab[dataSender+'_val'];   // tab

    if ( tab.swt_state == 0 && dataSender !='swt' && data.val != '?' ) return next ({ tts : 'Allumez d\'abord le dispositif' });

    // setting up/dwn offset
    if ( !data.offset ) data.offset = 10;

    // up/down new values
    if ( duinoCmd == 'up' || duinoCmd == 'dwn' )
        tab[dataSender+'_val'] = Math.max( 0, Math.min( parseInt( duinoVal ) + ( duinoCmd == 'dwn' ? data.offset =-data.offset : data.offset ), 255 ));

    if ( data.val ) {
        if ( (data.val=='up' || data.val=="dwn" ) && tab[data.obj] == 0 )                       // Available ?
            next ({ tts : settings[dataSender].cant })
        else if ( data.val == duinoCmd && ( duinoVal == '0' || duinoVal == '255' ) )            // Min or max ?
            next ({ tts : settings.minmax[tab[dataSender+'_val']] })
        else if ( data.val == tab[data.cmd])                                                    // Already done ?
            next ({ tts : settings[dataSender].already[duinoState] })
        else if ( data.val == '?' )                                                             // Current state ?
            next ({ tts : settings[dataSender].infos[tab[data.cmd]] })
        else if ( data.val == '#' )                                                             // Current value ?
            next ({ tts : settings[dataSender][data.cmd][data.val].replace('#', duinoVal) })
    }

    if ( !data.tts ) {
        // Switching ON/OFF
        if ( duinoCmd == 'state' ) tab[data.cmd] = 0x01 - tab[data.cmd];

        // Making arduino's requests
        if ( dataSender == 'swt' )
            clbk ( 'S\n' )
        else if ( dataSender == 'led' )
            clbk ( 'L' + tab[dataSender+'_val'] + ',' + tab.led_state + '\n' )
        else if ( dataSender == 'pot' )
            clbk ( 'T' + tab.pot_state + '\n' )
        else 
            clbk ( 'R' + tab.red_val + ',' + tab.green_val + ',' + tab.blue_val  + ',' + tab.rgb_state + '\n' );

        // Randomize response
        if ( data.val ) {
            var tts = Math.floor( Math.random() * settings[dataSender][data.cmd][data.val].length );
            next ({ tts:settings[dataSender][data.cmd][data.val][tts] });
        }
    }
}
