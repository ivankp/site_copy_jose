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
  DBView({
    div: $('#dbview'),
    dir: dir,
    dbs: dbs,
    default_selection: (col,i) =>
      (i==0 && !/^var\d+$/.test(col)) || (col=='complex'),
    process_data: draw
  });

  $('#color_picker > input').change(function(){
    const color = this.value;
    color_hist[0].setAttribute('fill',color);
    color_hist[1].g.attr('stroke',color);
    set_colors[color_hist[1].name] = color;
  }).focusout(function(){
    $('#color_picker').hide();
  });
});
