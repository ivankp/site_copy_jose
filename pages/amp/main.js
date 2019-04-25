const cache = { };
var color_hist;
const colors = [
'#000080','#FF0000','#006400','#FFA500','#C71585','#778899','#00FF00','#000000',
'#FFFF00','#00FA9A','#00FFFF','#0000FF','#FF00FF','#1E90FF','#FA8072','#EEE8AA',
'#47260F'
];
const set_colors = { };
const plots = [{
  width: 700, height: 500,
  assign: function(o){
    for (const key in o) this[key] = o[key];
    return this;
  },
  draw: single_plot
}];

function print(x) {
  console.log(x);
  return x;
}

function getUrlVars() {
  const vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
    function(m,key,value) { vars[key] = value; });
  return vars;
}

function load(url,data) {
  return $.ajax({
    type: 'POST',
    url: url,
    data: data,
    beforeSend: function() {
      $('form :input').prop("disabled", true);
      $('#loading').show();
    },
    dataType: 'text',
    dataFilter: function(resp) {
      if (resp.length) {
        try {
          return JSON.parse(resp);
        } catch(e) {
          alert('Bad server response: '+resp);
          console.log(resp);
          $('form :input').prop("disabled", false);
          $('#loading').hide();
        }
      } else alert('Empty server response');
      return false;
    },
    success: function(resp) {
      $('form :input').prop("disabled", false);
      $('#loading').hide();
    }
  });
}

function load_labels(name) {
  return load(dir+'/data/'+name+'.cols').done(function(resp){
    const labels = $('#labels').empty();
    const cols = [ ];
    for (const col of resp.cols) {
      const div = $('<div>').appendTo(labels);
      $('<div>').appendTo(div).text(col[0]).addClass('label_name');
      const sel = $('<select>').appendTo(div);
      cols.push(sel[0]);
      sel.attr({name:col[0],size:10,multiple:''})
      .append(col[1].map((x,i) => {
        const opt = $('<option>').text(x);
        return opt;
      }))
      .change(function(){
        const xs1 = $(this).val();
        if (xs1.length<1) return;
        const v1 = this.name;
        const v2 = resp.vals[v1];
        if (v2) {
          const xs2 = [ ]; // accumulate unique values
          for (const x1 of xs1) {
            for (const x2 of v2[1][x1])
              if (!xs2.includes(x2)) xs2.push(x2);
          }
          const s2 = $('#labels > [name='+v2[0]+']');
          const prev = s2.val();
          xs2.reduce((s,x) => s.append($('<option>').text(x)), s2.empty());
          if (xs2.length==1 && xs2[0].length==0) {
            s2.val('').hide();
          } else {
            s2.val(prev).show();
          }
        }
        if (cols.find(s => {
          const n = s.options.length;
          for (let i=0; i<n; ++i)
            if (s.options[i].selected) return false;
          return true;
        })) return;
        const labels = { };
        $('#labels [name]').each((i,x) => { labels[x.name] = $(x).val() });
        load_hists(sel,{ db: name, labels: labels});
      });
    }
  });
}

function encode(o) {
  let str = '';
  if (typeof o == 'object') {
    if (Array.isArray(o)) {
      let first = true;
      for (const x of o) {
        if (first) first = false;
        else str += ';';
        str += encode(x);
      }
    } else {
      str += '{';
      let first = true;
      for (const key in o) {
        if (first) first = false;
        else str += ';';
        str += key+'='+encode(o[key]);
      }
      str += '}';
    }
  } else str += o;
  return str;
}
function find_closing(str,a=0,b=0) {
  if (b==0) b = str.length - a;
  let n = 0;
  for (let i=a; i<b; ++i) {
    if (str[i] == '{') ++n;
    else if (str[i] == '}') if ((--n)==0) return i;
  }
  return b;
}
function decode(str,a=0,b=0) {
  if (b==0) b = str.length - a;
  let arr = [ ], obj = { }, key = null;
  let i = a, j = a, c;
  while (i<b) {
    c = str[i];
    if (c==';') {
      arr.push(str.slice(j,i));
      j = ++i;
    } else if (c=='=') {
      if (key!=null) {
        obj[key] = arr;
        arr = [ ];
      }
      key = str.slice(j,i);
      j = ++i;
    } else if (c=='{') {
      const e = find_closing(str,i,b);
      arr.push(decode(str,i+1,e));
      j = i = e+1;
    } else ++i;
  }
  if (c!='{') arr.push(str.slice(j,i));
  if (key!=null) {
    obj[key] = arr;
    return obj;
  } else return arr;
}

function load_hists(sel,req) {
  const req_str = encode(req);
  $('#share > a').prop('href',
    '?page='+page+'&plot='+encodeURIComponent(req_str));
  if (req_str in cache) {
    draw(req,cache[req_str]);
  } else {
    return load(dir+'/req.php',req).done(function(resp){
      cache[req_str] = resp;
      draw(req,resp);
      sel.focus();
    });
  }
}

function draw(req,resp) {
  const div = $('#plots > *');
  if (resp.length==0) {
    $("#nodata").show();
    div.hide();
    return;
  }
  $("#nodata").hide();

  plots[0].assign({
    hists: resp, div: div[0],
    x: req.labels.var1.join(', '), y: ''
  }).draw();
  $(div[0]).show();
}

function single_plot() {
  const plot = new Plot(this.div,this.width,this.height,'white');

  plot.axes(
    { range: plot.hist_yrange(function*(){
        for (const h of this.hists)
          for (const x of h[0]) yield x[0];
      }.call(this)), padding: [35,10], label: this.x },
    { range: plot.hist_yrange(function*(){
        for (const h of this.hists)
          for (const x of h[0]) yield x[1];
      }.call(this)), padding: [45,5], label: this.y }
  );

  const used_colors = [ ];
  this.hists.forEach((h,i) => {
    let color = null;
    if (h[1] in set_colors) {
      color = set_colors[h[1]];
      if (used_colors.includes(color)) color = null;
      else used_colors.push(color);
    }
    if (color==null) {
      color = colors.find(x => !used_colors.includes(x));
      if (color) {
        used_colors.push(color);
        set_colors[h[1]] = color;
      } else color = '#000000';
    }
    h.g = plot.line_graph(h[0]).attrs({
      stroke: color,
      'stroke-width': 2,
      fill: 'none'
    });
  });

  if (this.hists.length > 1) {
    const g = plot.svg.append('g');
    g.selectAll('text').data(this.hists).enter()
    .append('text').text(h => h[1]).attrs((h,i) => ({
      x: 0,
      y: 15*i,
      'class': 'plot_legend',
      fill: h.g.attr('stroke')
    })).on('click',function(h,i){
      color_hist = [this,h];
      const leg = $(this);
      const offset = leg.offset();
      $('#color_picker').css({
        top: (offset.top)+'px',
        left: (offset.left+g.node().getBBox().width)+'px'
      })
      .show()
      .find('> input')[0].jscolor.fromString(leg.attr('fill'));
    });
    g.attrs({
      'transform': 'translate('+
        (plot.width-g.node().getBBox().width-5)+',15)',
      'text-anchor': 'start',
      'font-family': 'sans-serif',
      'font-size': '15px'
    });
  }
}

$(function() {
  const form = $('form');
  $('<select>').appendTo(form.find('#db')).prop('name','db')
  .append([''].concat(dbs).map(x => $('<option>').text(x)))
  .change(function(){
    const sel = $(this);
    const name = this.value;
    if (name!=='') {
      sel.nextAll('.hint').hide();
      sel.nextAll('#share').show();
      return load_labels(name);
    } else {
      sel.nextAll('.hint').show();
      sel.nextAll('#share').hide();
    }
  })
  .after($('<img>').prop({
    id: 'loading',
    src: 'img/icons/loading.gif',
    alt: 'loading'
  }).css({
    display: 'none',
    'vertical-align': 'middle'
  }))
  .after($('<span>').prop({
    id: 'share'
  }).css({
    display: 'none'
  }).append($('<a>').prop({
    href: '?page='+page,
    target: '_blank'
  }).append($('<img>').prop({
    src: 'img/icons/share.svg',
    alt: 'share',
    height: 16
  }).css({
    'vertical-align': 'middle'
  })).append('share this page')))
  .after($('<span>').addClass('hint').text('← select plot set'));

  let plot_arg = getUrlVars()['plot'];
  if (plot_arg) {
    plot_arg = decode(decodeURIComponent(plot_arg))[0];
    const db = plot_arg['db'][0];
    if (dbs.includes(db))
      $('form [name=db]').val(db).triggerHandler('change')
      .done(function(resp){
        const labels = plot_arg['labels'][0];
        for (let name in labels) {
          const vals = labels[name];
          if (vals.length==0) vals.push('');
          $('form [name='+name+']').children().each( (i,x) => {
            x.selected = vals.includes(x.value);
          });
        }
        const sels = $('form select');
        if (sels.toArray().findIndex(
          s => Array.from(s.childNodes).findIndex(
            opt => (opt).selected) == -1) == -1)
        {
          sels.last().trigger('change');
        }
      });
  }

  $('#color_picker > input').change(function(){
    const color = this.value;
    color_hist[0].setAttribute('fill',color);
    color_hist[1].g.attr('stroke',color);
    set_colors[color_hist[1].name] = color;
  }).focusout(function(){
    $('#color_picker').hide();
  });
});
