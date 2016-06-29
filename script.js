var is_authed = false;
var handled_count = 0;
var total_count = 0;
var error_count = 0;


var loadTracks = function (username, cb) {
    var url = 'http://ws.audioscrobbler.com/2.0/' +
        '?method=user.getlovedtracks' +
        '&user=' + username +
        '&api_key=' + config.lastfm_api_key +
        '&format=json' +
        '&limit=1000';

    var req = new XMLHttpRequest();
    req.open('GET', url, true);

    req.onreadystatechange = function (aEvt) {
        if (req.readyState == 4) {
            if (req.status == 200) {
                return cb(JSON.parse(req.responseText));
            }
        }
    };

    req.send(null);
};

var appendLog = function (text) {
    var log = document.querySelector('pre').textContent;

    log = log + text + '\n';

    document.querySelector('pre').textContent = log;
};

var updateCounter = function () {
    document.querySelector('#status').setAttribute('class', '');
    document.querySelector('#handled_count').textContent = handled_count;
    document.querySelector('#total').textContent = total_count;
    document.querySelector('#error_count').textContent = error_count;
};

var handleLoved = function (lovedtracks) {
    if (lovedtracks.length === 0) {
        return;
    }

    handled_count = total_count - lovedtracks.length;
    updateCounter();

    var lt = lovedtracks.shift();
    var artist = lt.artist.name;
    var track = lt.name;
    var query = artist + ' ' + track;

    return DZ.api('/search/track?q=' + query, function (response) {
        if (response.total === 0) {
            appendLog(artist + ' -- ' + track);
            appendLog('!!! Not found');
            error_count++;

            return handleLoved(lovedtracks);
        }

        return DZ.api('/user/me/tracks', 'POST', {
            track_id: response.data[0].id
        }, function (response) {
            if (response.error) {
                appendLog(artist + ' -- ' + track);
                appendLog('!!! ' + response.error.message);
                error_count++;
            }
            
            return handleLoved(lovedtracks);
        });
    });
};

document.querySelector('#deezerlogin').addEventListener('click', function () {
    return DZ.login(function(response) {
        if (response.authResponse) {
            is_authed = true;

            return DZ.api('/user/me', function(response) {
                document.querySelector('#deezerusername')
                    .textContent = response.name;
            });
        }
    }, {perms: 'basic_access,manage_library'});
});

document.querySelector('#dostuff').addEventListener('click', function () {
    if (!is_authed) {
        alert('You need to be logged to Deezer');
        return;
    }

    var username = document.querySelector('#lastfmusername').value;
    return loadTracks(username, function (data) {
        if (data.lovedtracks.track.length === 0) {
            return;
        }

        document.querySelector('#dostuff').setAttribute('class', 'hidden');
        total_count = data.lovedtracks.track.length;
        error_count = 0;
        return handleLoved(data.lovedtracks.track);
    });
});

DZ.init({
    appId : config.deezer_api_id,
    channelUrl : config.deezer_channel_html
});
