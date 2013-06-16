//** CONFIGURE **//
var year = 2013
var dataFile = 'data/summer' + year + '.json';

//** READY **//
$(function () {
  var map = new Map();

  map.loadData(dataFile, function () {
    map.initLegend();
    map.initTables();
    map.initSelection();
  });

  $('h1 #year').text(year);

  $('#help').on('click', function(){
    info('Apuva!', 'Hiiri ryhmän nimen päälle niin näet lisätietoja.<br /><br />' +
    'Hiiri konepaikan päälle niin näet kuka siinä oleskelee. Klikkaamalla valitaan.<br /><br />' +
    'Haussa välilyönti toimii or-operaattorina, eli voit hakea useiden henkilöiden sijainnin ' +
    'kerralla.<br /><br />Projektiin voit osallistua ' +
    '<a href="https://github.com/tuhoojabotti/Assembly-PlaceMap">Githubissa</a>.');
  });

  $("input[type='text']").keypress(function (e) { // Also update search if user presses Enter.
    if (e.which !== 13) { return };
    var i = $(this);

    var s = i.val().trim()
    if (!s) { return; }

    i.val('').blur().focus();
    var regex = new RegExp(s.replace(/ /g, '|'), 'i');

    $.each(map.people, function(k, v) {
      if (!v.sel && regex.test(v.nick)) { v.toggle(true); }
    });
  });

});


function Map() {
  this.paper = Raphael('map', 716, 673);
  this.map = undefined;
  this.selection = new Selection();
  this.config = {};
  this.people = [];
  this.groups = [];
  this.tables = [];
}

Map.prototype.loadData = function (file, cb) {
  var map = this;
  $.getJSON(file, function (data) {
    map.groups = data.groups;
    map.tables = data.tables;
    map.config = data.config;
    this.map = map.paper.image(map.config.map, 0, 0, 716, 673);
    cb();
  }).fail(function () { console.error('Failed to load map data.'); });
};

Map.prototype.initLegend = function () {
  var map = this, row = 0, legend = map.config.legend;

  // Draw the background and title
  map.paper.rect(legend.x, legend.y, legend.width,
                 legend.lineHeight * 2 + Object.keys(map.groups).length * legend.lineHeight).attr({'fill': 'white'});
  map.paper.text(legend.x + legend.width / 2, legend.y + legend.lineHeight, 'RYHMÄT:').attr({'font-weight': 'bold'});

  // Draw group names
  $.each(this.groups, function drawGroup(name, data) {
    map.paper.rect(legend.x + 8, legend.y + legend.lineHeight * 1.65 + row * legend.lineHeight, 10, 10).attr({
      'fill': data.color,
      'stroke-opacity': 0
    });
    $(map.paper.text(legend.x + legend.width / 2, legend.y + legend.lineHeight * 2 + legend.lineHeight * row++, name).node).css({'cursor': 'pointer'})
    .mouseenter(function () {info(name, data.description);});
  });
}

Map.prototype.initTables = function () {
  var map = this, def = $.Deferred();

  $.each(map.tables, function (){
    var table = this;

    $.each(table.place, function () {
      map.people.push(new Place(this, table, map));
    });
  });
};

Map.prototype.initSelection = function () {
  var hash = location.hash.substring(1).split("+");
  $.each(this.people, function () {
    if (hash.indexOf(encodeURIComponent(this.nick)) != -1) {
      this.toggle(true);
    }
  });
};

//** Place object **//
function Place(data, table, map) {
  var place = this, size = map.config.place.size, rect = map.config.place.rect;

  // Copy data.
  place.map = map;
  place.nick = data.nick;
  place.details = data.details;
  place.group = data.group;
  place.id = data.id;
  place.pos = '(' + table.id + '/' + place.id + (data.places ? '-' + (place.id + data.places - 1): '') + ') ';
  place.color = map.groups[place.group] ? map.groups[place.group].color : 'black';
  place.places = data.places;

  // Create SVG element.
  place.svg = map.paper.rect(
    table.x + (1 + ((data.id - 1) % table.cols)) * size,
    table.y + (Math.floor((data.id - 1) / table.cols)) * size,
    rect * (data.places ? data.places : 1) + (data.places ? data.places - 1 : 0), rect)
  .attr({
    'fill': place.color,
    'stroke-opacity': 0,
    'title': place.nick
  });

  // Bind event to the SVG element.
  $(place.svg.node).css({'cursor': 'pointer'})
  .data({obj: place})
  .hover(function () {
    if (!place.sel) {place.svg.attr({'fill':'red', 'transform': 's1.6'}).toFront();}
    info(place.pos + place.nick, place.details ? place.details : 'Data unavailable!');
  }, function () {
    if (!place.sel) { // Only reset if not selected
      place.svg.attr({'fill': place.color, 'transform': 's1'});
    }
  }).click(function () {place.toggle();});
}

Place.prototype.toggle = function (override) {
  if (!this.sel || override) {
    this.sel = true;
    this.svg.attr({'fill':'red', 'transform': 's1.3'});
    this.map.selection.add(this, false);
  } else {
    this.sel = false;
    this.svg.attr({'fill': this.color, 'transform': 's1'});
    this.map.selection.del(this, false);
  }
};

function info(t, s) {
  if (s) {
    $('#info').html(
    '<h2>' + t + '</h2>' +
    '<p>' + s + '</p>');
  } else { // Append
    $('#info p').append(t);
  }
}


//** SELECTION MANAGER **//
function Selection(a) {
  var sel = this;
  sel.items = a ? a : [];

  $('<a href="#">[clear]</a>').appendTo('#selection h2')
  .css({'font-size':'12px'})
  .click(function () {sel.clear();});
  $('#selection').append('<p></p>');
}

Selection.prototype.add = function (i, click) {
  if (this.items.indexOf(i) != -1) { return; }
  this.items.push(i);
  if (click) { i.toggle(true); }
  this.update();
};

Selection.prototype.del = function (i, click) {
  if (this.items.indexOf(i) == -1) { return };
  this.items.splice(this.items.indexOf(i), 1);
  this.update();
  if (click) { i.toggle(false); }
};

Selection.prototype.toString = function (s) {
  var ret = '';
  for (var i = 0; i < this.items.length; ++i) {
    if (i > 0) {ret += s ? s : '+';}
    ret += encodeURIComponent(this.items[i].nick);
  }
  return ret;
};

Selection.prototype.update = function () {
  var sel = this, i;
  $('#selection p').empty();
  for (var j = 0; j < sel.items.length; ++j) {
    if (j > 0) {$('#selection p').append('<br />');}
    i = sel.items[j];
    $('<span>' + i.pos + i.nick + '</span>')
    .css({'cursor': 'pointer'})
    .data('obj', i)
    .mouseenter(function () {
      var i = $(this).data('obj');
      info($(this).text(), i.details ? i.details : 'Data unavailable!');
    }).click(function () {
      sel.del($(this).data('obj'), true);
    }).appendTo('#selection p');
  }
  location.hash = sel;
};

Selection.prototype.clear = function () {
  var len = this.items.length;
  for (var i = 0; i < len; i++) {
    this.items[0].toggle(false);
  }
  this.update();
};
