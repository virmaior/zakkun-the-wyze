const za_classes = ['za_start','za_end','za_nothing'];
var za_size = za_classes.length;

class Zrange{
  constructor(date,hour,cam,start,end,label)
  {
    this.date = date;
    this.hour = hour;
    this.cam = cam;
    this.start = start;
    this.end = end;
    this.label =  label;
  }

  static from_JSON(mux,x)
  {
    const pieces  = mux.split(';');
    var date = window.miru_tool.date;
    var cam = "";
    var hour ="";
    pieces.forEach((item) => {
        const smallp = item.split(':');
        switch (smallp[0]) {
                case "h": hour = smallp[1];  break;
                case "d": date = smallp[1];  break;
                case "c": cam = smallp[1];      break;
        }
    });
	const y = [];
	x.forEach( (item) => {
		y.push(  new Zrange(date,hour,cam,item["start"],item["end"],item["label"]));
	});
	return  y;
  }

  static from_string(x)
  {
    const pieces	= x.split(';');
    var cam = ""; var hour = ""; var date = ""; var start = ""; var end = ""; var label = "";
    pieces.forEach((item) => {
 	const smallp = item.split(':');
 	switch (smallp[0]) {
		case "c":
		case "cam":  cam = smallp[1];	break;
                case "hour":
		case "h": hour = smallp[1];  break;
                case "d": date = smallp[1];        break;
		case "start":
		case "s": start = smallp[1];	break;
                case "end":
		case "e": end = smallp[1];        break;
		case "label": 
               case "l": label = smallp[1].replace(/_/g," ");        break;
	}
    });
    return new Zrange(date,hour,cam,start,end,label);
  }

  makePrettyLabel()
  {
        let item_label_pretty = 'blank';
        if (this.label) { 
                item_label_pretty = this.label.replace(/_/g," ");
        }
	return item_label_pretty;
  }


  appendDIV(t,newHTML)
  {
    document.querySelector(t).insertAdjacentHTML('beforeend',newHTML);
  }

  cross_reference()
  {
	const item_label_pretty = this.makePrettyLabel();
        this.appendDIV('.other_cams[minute="' + this.start +  '"]','<div class="cam_' + this.cam + ' za_start_weak">' + item_label_pretty + '</div>');
        var i = (this.start *1);
        if (this.end == this.start) { return false; }
	var last_mid = (this.end * 1) -1;
        while (i  < last_mid) {
                i++;
                var i_pretty = String(i).padStart(2, '0')
                this.appendDIV('.other_cams[minute="' + i_pretty +  '"]','<div class="cam_' + this.cam + ' za_continue_weak">' + item_label_pretty + '</div>');
        }
        var i_pretty =  String(this.end * 1).padStart(2, '0')
        this.appendDIV('.other_cams[minute="' + i_pretty +  '"]','<div class="cam_' + this.cam + ' za_end_weak">' + item_label_pretty + '</div>');
   }

 	self_reference()
	{
        const item_label_pretty = this.makePrettyLabel();
        var i_pretty =  String(this.start * 1).padStart(2, '0');
	const startEl = document.querySelector(`.zminute_DIV[minute="${i_pretty}"]`);
	startEl.querySelectorAll(".zm_marker .range_label").forEach( label => { label.remove(); } );
 	startEl.classList.add('za_start');
        window.miru_tool.startHTML(i_pretty,item_label_pretty);
        i_pretty =  String(this.end * 1).padStart(2, '0');

        const endEl = document.querySelector(`.zminute_DIV[minute="${i_pretty}"]`);
	endEl.classList.add('za_end');
	if (this.end > this.start) {
	        endEl.querySelectorAll(".zm_marker .range_label").forEach( label => { label.remove(); } );
        	window.miru_tool.endHTML(i_pretty);
	}
	}


  reference(current_hour, current_cam)
  {
	if (this.hour  ==  current_hour) {
		if (this.cam == current_cam) {
                          this.self_reference();
                        }
                        else {
                          this.cross_reference();
                        }
                }
  }

  express_string()
  {
    var clean_label = "blank";
    if (this.label !== undefined) {
		 if (this.label) {
	    		clean_label = this.label.replace(' ','_');
		}
	}
    return "d:" + this.date + ";h:" + this.hour  +  ";c:" + this.cam +  ";s:" + this.start + ";e:" + this.end + ";l:" +  clean_label; 
  }

 express_html()
 {
        var item_text =  '<div class="range_start">' + this.start + '</div><div class="range_end">' + this.end + '</div>'; 
        if (this.label) { 
                var item_label = this.label.replace(/_/g," ");
                item_text += '<div class="range_label">' + item_label + '</div>'; 
        }
        var range_width = this.end - this.start + 1;
        return '<div class="html_range cam_' + this.cam + '" start="' + this.start  + '" style="--start:' + this.start  + ';--rangewidth:' + range_width  +  '">' +  item_text + '</div>';
 }

 hour_label()
 {
	var url = "/" + this.date;
	if (this.cam > 1) {  url = url + "-" + this.cam; }
 	url = url + "/screens" + this.hour + ".html"; 
        return '<div class="output_hour cam_' + this.cam + '">' + this.hour + '<Br /> <a href="'  + url  + '">' + this.cam + '</a></div>'; 
 }


}

window.miru_tool = 
{
	date:false, 
	cam: false,
	max_cam_count : 7,
	hour:false,
	run_string: false,

bindShift:function(mxt)
{
        mxt.find('.shifter').on('click',shifter);
},
shiftHTML:function()
{
  return '<button class="shifter">Up</button><button class="shifter">Down</button>';
},

startHTML:function(minute,value)
{
        const mxt = $('.zminute_DIV[minute=' + minute + ']');
        mxt.find('.zm_marker').append('<div class="range_label" state="za_start"><input class="rl_name"  minute="' + minute + '" value="' + value + '" />' + 
	this.shiftHTML() + '</div>');
        this.bindShift(mxt);
},

endHTML:function(minute)
{
        const mxt = $('.zminute_DIV[minute=' + minute + ']');
        mxt.find('.zm_marker').append('<div class="range_label" state="za_end">'  + this.shiftHTML() + '<div>');
        this.bindShift(mxt);
},

	make_range:function(ranges,start,end, label,cam)
	{
   		ranges.push (new  Zrange(this.date,this.hour,cam,start,end,label));
	},
	copied:function()
	{
		this.run_string.setAttribute('state','copied');
	},
	bind_clearer:function()
	{
        document.querySelectorAll('.clearer').forEach (cl => {
                if (cl._click) {
                         cl.removeEventListener('click', cl._click);
                } 
                cl._click =  (e) => { this.clear_all(e); } ;
                cl.addEventListener('click',cl._click); 
        });
	},
	init:function()
	{
		this.ranges = document.getElementById("ranges");
		this.run_string = document.getElementById("run_string");
		const ztd = document.querySelector(".za_top_DIV");
	        this.date = ztd.getAttribute('day');
	        this.cam = ztd.getAttribute('cam');
		let curcam = this.cam;
		if (curcam > 6) { curcam--;  }
	        document.documentElement.style.setProperty('--cur-cam',curcam );
        	this.hour = ztd.getAttribute('hour');
        	ztd.classList.add("cam_" + this.cam);
		if (document.getElementsByClassName("clear1").length == 0) {
			document.querySelector(".range_tools").insertAdjacentHTML('beforeend','<div class="clear1" onclick="window.miru_tool.clear1(e)" >Clear 1</div>');
			this.bind_clearer();
		}
document.body.append(Object.assign(document.createElement('pre'), {
  id: 'real_string',
  style: 'display:none'
}));

	this.bind_clearer();
        document.querySelectorAll(".next_cam").forEach( nc => { nc.addEventListener('click',(e) => { this.next_feed(e);} ); });
        document.querySelectorAll(".prev_cam").forEach( nc => { nc.addEventListener('click',(e) => { this.prev_feed(e);} ); });
	},
	prev_feed:function(e) {
                e.preventDefault();
                generate_ranges();
		if (this.cam > 1) {
                	window.location.href =   "/" + this.date + '-' + ((this.cam * 1) - 1) + '/screens' + ("00" +  this.hour).slice(-2)  + '.html';
		} else { alert('not yet implemented'); }
	},
	next_feed:function(e) {
		e.preventDefault();
		generate_ranges();
		if (this.cam < this.max_cam_count ) {
			window.location.href =   "/" + this.date + '-' + ((this.cam * 1) + 1) + '/screens' + ("00" +  this.hour).slice(-2)  + '.html';
		}
	},
	load:function()
	{
		var x=   localStorage.getItem("zaday");
		console.log("loaded " + x);
		if (x) {  x = JSON.parse(x); }
		return x;
	},
	update_ranges:function(clean_ranges)
	{
        	var all_ranges = this.load();
        	if (!all_ranges)  { all_ranges = {} }
        	all_ranges["h:" + this.hour + ";c:" +  this.cam ] = clean_ranges;
        	console.log("updated to " + all_ranges);
        	this.store(all_ranges);
	},
	store: function(value)
	{
		console.log(" saved " + value);
	        localStorage.setItem('zaday',JSON.stringify(value));
	},
	clear1:function()
	{
		const all_ranges = this.load();
        	if (!all_ranges) {  	return false; }
		delete all_ranges["h:" + this.hour + ";c:" + this.cam];
		this.store(all_ranges);
		document.querySelectorAll('.zminute_DIV').forEach(zm => {
			zm.classList.remove('za_start');
                        zm.classList.remove('za_end');

		});
  		document.querySelectorAll('.range_label').forEach (rl => { rl.remove(); } );
		this.show();
	},
	clear_all:function()
	{
		this.store({});
		this.ranges.innerHTML = '<div id="select_bar"></div>';
		this.generateBar();
  		this.run_string.innerHTML ='';
		this.run_string.setAttribute('state','clear');
	},
	show:function()
	{

        var all_ranges = this.load();
        if (!all_ranges) {  all_ranges  = []; }
        var my_string = "";
        const cam = this.cam;
        var this_hour = "h:" + this.hour;
        const htmls = [];

	document.querySelectorAll('.other_cams').forEach(el => {
  		el.innerHTML = ''; 
	});

        for(var hour in all_ranges)
        {
                const zr = Zrange.from_JSON(hour,all_ranges[hour]);
		my_string +=  hour + '>';
 		var piece_count = 0;
		const my_html = [];
		zr.forEach((item) => {
			piece_count++;
			if (piece_count > 1) { my_string += ","; }
			my_string +=   item.express_string();
			my_html.push( item.express_html());
			item.reference(this.hour,miru_tool.cam);

		});
		const ar_parts = hour.split(";");
                htmls.push('<div class="output_row" hour="' + this.hour  + '" cam=' + ar_parts[1]   +  '>' + zr[0].hour_label()  +  my_html.join('') + '</div>');

		my_string += "V\n";
                console.log(my_string);
        	}
	document.getElementById('ranges').innerHTML = htmls.join('');
	this.generateBar();
	this.run_string.innerHTML = 'sudo zsh za-horu.sh d=' + this.date  + '  i="' + my_string + '"';
	document.getElementById("real_string").innerHTML = my_string;
	},
	png:function(min,sec)
	{
	  exec_copy('sudo zsh za-png.sh d='  + this.date   + ' cam=' + this.cam + ' h=' + this.hour + ' min=' + min + ' sec=' + sec);
	},
generateBar:function()
{
        console.log("generated select bar");
        $("#select_bar").remove();
        $("#ranges").prepend('<div id="select_bar"></div>');
	const sBar =  $("#select_bar");
	sBar.append('<div class="output_hour">Jump</div>');
        document.querySelectorAll(".zminute_DIV").forEach( el => {
                const minute = el.getAttribute('minute');
                var match_classes = ' ' + el.className.replace('zminute_DIV','');
                sBar.append('<div class="sb_DIV' + match_classes  + '" id="sb_' + minute + '" minute="' + minute + '" style="--minute:' + minute +  '">' +
			    '<a class="MIN_jumper">' + minute + '</a></div>');
        });
        document.querySelectorAll(".MIN_jumper").forEach (mj => { mj.addEventListener('click',(e) => {
                e.preventDefault();
                $([document.documentElement, document.body]).animate({
                        scrollTop: $('.zminute_DIV[minute="' +  $(e.currentTarget).text()  + '"]').offset().top
                }, 100);
        }); });
	document.querySelectorAll('.za_minute').forEach(el => { el.classList.add('za_nothing'); });
        $(".za_DIV").off('click').on('click',
        (e) => {
                var minute = $(e.currentTarget).parent().attr('minute');
                toggle_state(minute);
        });
        img_compare.highlight();
	}
}

function ungroup(zgroup)
{
	console.log("unstack on " + this.getAttribute('zgroup'));
	document.querySelectorAll('.zminute_DIV[zgroup=' + zgroup  + ']').foreach( a => {
		a.style.postion = 'relative';
		a.style.marginTop = '0';
		a.setAttribute('zgm',0);
	});
}

function faster_look(group_size)
{
	var item_count = 0;
	var row_height = Math.floor($(".zminute_DIV[minute=00]").outerHeight() );
        document.documentElement.style.setProperty('--zminute_height',(row_height + 1) + "px" );

	$(".zminute_DIV").each(function(){
		const $t = $(this);
		var group = Math.floor(item_count / group_size);
		var num_in_group = item_count - ((group)  *  group_size);
		$t.attr('zgroup',group);
		$t.attr('zgm',num_in_group + 1);
		if (num_in_group > 0) {
			$t.css('position','absolute');
			$t.css('margin-top','-' + (row_height) + 'px');
		}
		$t.off('click').on('click',(e) => {
			e.preventDefault();
  			ungroup(e.currentTarget.getAttribute('zgroup'));
		});
		item_count++; 
	});
}

function zsh_decode(my_ranges)
{
	const  zsh_output = [];
        my_ranges.forEach( (item) => 
	{
                zsh_output.push( item.express_string());
        });
        return zsh_output.join(',');

}

function get_range_name(minute)
{
	if ($('.range_label INPUT[minute="' + minute +  '"]')) {
		const rrange  = $('.range_label INPUT[minute="' + minute +  '"]').val();
		if (typeof rrange !== "undefined") {
			if (rrange != "") { 
				return rrange.replace(/ /g,"_"); 
			}
		}
		return "no name";
	}
	console.log("failed on" + '.range_label INPUT[minute="' + minute +  '"]' ); 
	return false;
}

function generate_ranges()
{
	console.log("started range generator");
	const ranges = [];
	var first_minute = false;
	var tight_interval = 1;
	var rangeName = false;
	const mt = window.miru_tool;

        const cam = mt.cam;
	document.querySelectorAll('.zminute_DIV').forEach((el) => {
		 const minute = el.getAttribute('minute');
		 const hasStart = el.classList.contains('za_start');
                 const hasEnd = el.classList.contains('za_end');
		let rangeName = '';
		if (hasStart && hasEnd) {
			console.log('start/end minute');
			if (!first_minute) {
			   rangeName = get_range_name(minute);
			   mt.make_range(ranges,minute,minute,rangeName,cam);
			}

		}
		else if (hasStart) {
			console.log('minute start');
			first_minute = minute;
		}
		else if (hasEnd) {
			rangeName = get_range_name(first_minute);
			mt.make_range(ranges,first_minute,minute,rangeName,cam);
			first_minute = false;
		}

	});

	if (first_minute) {
		console.log("determined final block is active");
        	rangeName = get_range_name(first_minute);
		mt.make_range(ranges,first_minute,59,rangeName,cam);
	 }


	if (ranges.length == 0) {
		alert("no ranges marked for camera #" + cam  + "\n Stopping Range Generation");
		return false;
	}

	console.log("tidying ranges");
	const hour = mt.hour;
	const clean_ranges = [];
	var last_start = false;
	var last_end = false;
	var last_name_range =false;
	ranges.forEach(
	 (item,index) =>  {
		var current_start = item.start;
		var current_end = item.end;
	        var range_name  = item.label;
		console.log("with " + item.start + " to " + item.end);
		if (!last_start) { last_start = current_start; last_end =  current_end; last_range_name = range_name; }
		else { 
		   if (current_start == (last_end + 1)) {
			last_end = current_end;
		   } else {
			mt.make_range(clean_ranges,last_start,last_end,last_range_name,cam);
			last_start = current_start; last_end =  current_end; last_range_name = range_name;
		   }
		}
		console.log(clean_ranges);
	});

	if (last_start) {
		mt.make_range(clean_ranges,last_start,last_end,last_range_name,cam);
	}
	console.log(clean_ranges);
	mt.update_ranges(clean_ranges);
	mt.show();
}


function find_before(minute)
{
	var search_min =  minute -1;
	while (search_min >= 0 ) {
    		const s = search_min.toString().padStart(2,"0");
		const test = document.querySelector(`.zminute_DIV[minute="${s}"]`);
		if (test?.classList.contains('za_end')) return 'za_end';
		if (test?.classList.contains('za_start')) return 'za_start';
		search_min = search_min - 1;
	}
	return "za_end";
}

function toggle_state(minute)
{
        console.log("called toggle 3 on " + minute);
        var mxt = $('.zminute_DIV[minute=' + minute + ']');
        toggle_set( $('.sb_DIV[minute=' + minute + ']'));
        toggle_set(mxt);
        mxt.find('.zm_marker .range_label').remove();

        if (mxt.hasClass('za_start')) {
                var value = "";
                if (mxt.attr('range_label') !== undefined) { value = mxt.attr('range_label'); }
                window.miru_tool.startHTML(minute,value);
        } else if (mxt.hasClass('za_end'))  {
                window.miru_tool.endHTML(minute);
        }
}

function toggle_set(el)
{
	var current_za_class = za_size -1;
	var priorClass = find_before($(el).attr('minute')*1);
	var default_target = 'za_start';

	za_classes.forEach(
	function(item,index)
	{
	   if (el[0].classList.contains(item)) {
		current_za_class = index;
	   }
	}
	);

	var oldClass 	= za_classes[current_za_class];
	if (oldClass == "za_start") { el.attr('range_label',el.find('.rl_name').val());  }
	var newClass	= za_classes[(current_za_class+1)%za_size];
	if (newClass == priorClass) {
		newClass = za_classes[(current_za_class+2)%za_size];
	}

	force_set(el,newClass); 
}

function force_set(el,my_class)
{
	const $el = $(el);
        $el.removeClass(za_classes.join(' '));
        $el.toggleClass(my_class);
}

function shifter(e)
{
        e.preventDefault();
	const $me = $(this);
	const move  = $me.text();
	var my_range = $me.parent();
	const srow = $me.closest('.zminute_DIV');
	const source = srow.attr('minute') * 1;
	var drow= false;
	var dest = source;
	while (!drow) {
		switch (move)
		{
             		case "Up":dest = dest - 1; break;
             		case "Down": dest = dest +1; break;
		}
	//	console.log('shifting from ' + source  + ' at ' + dest);
		var drow_obj  =  $('.zminute_DIV[minute=' + dest.toString().padStart(2,"0") + ']');
	//	console.log(drow_obj);
		if (drow_obj.length > 0) { drow = drow_obj; }
		if (dest < 0 ) {  return false; }
		if (dest > 59 ) { return false; }
	}

   	var state =  my_range.attr('state');
        //console.log('start with ' + source + ' dest  ' + dest + "and state " + state);
	my_range.find('INPUT').attr('minute',dest);
	my_range.appendTo(drow.find('.zm_marker'));
	drow.addClass(state);
	srow.remove('.range_label[state=' + state  + ']').removeClass(state); 

	force_set( $('.sb_DIV[minute=' + source + ']'),'za_nothing');
	force_set( $('.sb_DIV[minute=' + dest + ']'),state);
	window.miru_tool.generateBar();
}


function exec_copy(str,dof = false)
{

  var textArea = document.createElement("textarea");
  textArea.value = str;
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    if (typeof dof  === 'function') {
	dof();
  	}
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}



var img_compare =
{
 scale:0.1,
 parts:[],
 sensitivity:10,
 base_width: 1920,
 base_height: 1080,
 iwidth: 0,
 iheight: 0,
 pwidth: (1920 / 3),
 pheight:  (1080 /3),
 smap:[],
 debug:false,
 log(x)
 {
    if (this.debug) {	console.log(x); }
 },
which_part(i) {
   
    const row =  Math.floor( i / (this.iwidth * 4));
    const col =  (i / 4)  -  (row * this.iwidth);

    let vertical = 't';
    if (row > 2 * img_compare.pheight) vertical = 'b';
    else if (row > img_compare.pheight) vertical = 'm';

    let horizontal = 'l';
    if (col > 2 * img_compare.pwidth) horizontal = 'r';
    else if (col > img_compare.pwidth) horizontal = 'c';

    return vertical +  horizontal;
},
 which_part_old(i)
 {
	const hheight  = this.iheight / 2;
	const hwidth = this.iwidth / 2;
	const row =  Math.floor( i / (this.iwidth * 4));
	const col =  (i / 4)  -  (row * this.iwidth);

	var region = ["t" , "l"];
	if (col > hwidth) { region[1] = "r"; }
/*	urusai++;
	if (urusai < 10000) {
        console.log('checked i of ' + i + '; interpreted as row ' + row + ' and col ' + col);
	console.log( ' versus width ' + hwidth + ' and ' +  hheight + ' height resulting in region ' + region );
}*/
	
	if (row > hheight) {  region[0] = "b"; }
	return region.join('');
 },
run()
{
   const c = [];
   img_compare.iwidth = this.base_width * this.scale;
   img_compare.iheight = this.base_height * this.scale;
   iwidth = img_compare.iwidth;
   iheight = img_compare.iheight;
   const dmap = [] 


  /** create two canvases for running the image comparison, append them to the bottom of the document **/
  for (var i = 0; i <= 1;  i++) 
  {
	$('body').append( '<canvas width="' + img_compare.iwidth +  '" height="' + img_compare.iheight +'"  id="c' + i +  '"></canvas>');
  	c[i] = $('#c' + i)[0].getContext('2d',{willReadFrequently: true});
   }
  var run = 0; /* track run count */
  	for (min = 0; min <=59; min++) { /*loop over full range of minutes and screens */
    		for (screen = 1; screen <=3; screen++) {
	   		const fmnt = ("00" + min).slice(-2);
	   		const fscreen = ("000" + screen).slice(-3) ;
			const squery = '.za_img[minute=' + fmnt +  '][screen=' + fscreen + ']'; 
	  		this.log('loaded img at '  + squery);
			const img_obj = $(squery)[0];
			if (!img_obj) { continue;  }
	   		run++;
	  		c[run % 2].drawImage(img_obj,0,0,iwidth,iheight);
          		img_compare.eightbit(c[run %2]);

	   		if (run == 1) { continue;  }
	   		var dpit  =  img_compare.compare(c[0].getImageData(0,0,iwidth,iheight).data,c[1].getImageData(0,0,iwidth,iheight).data);
	   		dpit.min = fmnt;
	   		dpit.screen = fscreen;
			dpit.squery = squery;
			dmap.push(dpit);
    		}
  	}
	this.smap = dmap;
	console.log(dmap);
	document.getElementById('c0').remove();
	document.getElementById('c1').remove();
	this.highlight();
  },
  highlight()
  {
	this.log('ran highlight');
	var max_dsize =0;
	var ds2 = 0;
	this.smap.forEach((sc,index) => {
		if (sc.dsize > max_dsize) { 
			ds2 = max_dsize;
			max_dsize = sc.dsize; 
		} else if (ds2 < sc.dsize) {
			ds2 = sc.dsize;
		}
                $('.sb_DIV[minute=' + sc.min + ']').css('--dsize_' + sc.screen,sc.dsize + '');
        });
	console.log(this.smap);
	this.smap.sort((a,b) =>  b.dsize - a.dsize).slice(0,10).forEach((sc,index) => {
  	 $('.sb_DIV[minute=' + sc.min + ']').attr('stype','motion').attr('marea',sc.region[0]).attr('yarea',sc.region[1]);
        const $sc =  $(sc.squery);
	$sc.attr('stype','motion').attr('marea',sc.region[0]).attr('yarea',sc.region[1]);
	$sc.parent().attr('marea',sc.region[0]).attr('yarea',sc.region[1]);
	});
	$('#ranges').css('--maxd',ds2 + '');  //use the second highest value
	console.log('set maxd to ' + ds2 );
  },
  compare(a,b)
  {
	var diff = 0;
	var dsize = 0;
	var regions = { 'tl' : 0, 'tc':0, 'tr':  0 , 'ml': 0, 'mc' :0, 'mr' :0,  'bl' : 0 , 'bc': 0,  'br' : 0 };
        img_compare.pheight  = this.iheight / 3;
        img_compare.pwidth  = this.iwidth / 3;
	for(var i = 0, il = a.length; i < il; i +=4) { /** pixel by pixel identify differences up to sensitivity and add their magnitude **/
                 const  ds1 = Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]);
  		 if  (ds1 > this.sensitivity) { 
			diff++;
			dsize += ds1;

			const my_reg = img_compare.which_part(i)
			regions[my_reg] = (regions[my_reg] * 1) +  ds1; 
		}  
	}
	this.log('difference count of ' + diff + ' over size ' + a.length + ' diff magnitude ' + dsize);

	
	return {
		'diff': diff ,
		'dsize' : dsize,
		'len' : a.length,
		'region' :  Object.keys(regions).reduce((a, b) => regions[a] > regions[b] ? a : b),
		'regions' : regions
		} 
},

  eightbit(ctx) {
	var imgdata = ctx.getImageData(0,0,this.base_width * this.scale, this.base_height * this.scale); // get data
	var data = imgdata.data; // bytes
	const crange= 8;
	// 8-bit: rrr ggg bbb
	for(var i = 0; i < data.length; i += 4) {
    		data[i]     = img_compare.nearest(data[i],     crange); // set value to nearest of 8 possibilities
    		data[i + 1] = img_compare.nearest(data[i + 1], crange);
    		data[i + 2] = img_compare.nearest(data[i + 2], crange);
	}

	ctx.putImageData(imgdata, 0, 0); // put image data to canvas
  },
  nearest(x, a) {
	// will round down to nearest of a possibilities in the range 0 <= x <= 255
    	  return Math.floor(x / (255 / a)) * (255 / a);
  }
}


$(document).ready(function() {
	const mt = window.miru_tool;
	mt.init();
    	document.querySelectorAll(".zminute_DIV").forEach( zm => {
                const minute = zm.getAttribute('minute');
                $(zm).find('.zm_marker:first').append('<div class="other_cams" minute="' + minute  + '"></div>');
       });
	document.querySelectorAll('.generator').forEach (g => { g.addEventListener('click',(e) => {  generate_ranges(); } ); });

	$('.cam7').html('Send').off('click').on('click',(e) =>  {

fetch('/cgi-bin/za-horu.cgi?d=' + mt.date  + '&h=' + mt.hour  +  '&i="' + encodeURIComponent($("#real_string").html()) + '"' )
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.statusText);
    } else {
	                $("#run_string").attr('state','sent');
  }
    return response.json(); // or response.text(), depending on the response type
  })
  .then(data => console.log('Response:', data))
  .catch(error => console.error('Request failed:', error));
	});
	$('.copyit').off('click').on('click',(e) =>  {
	try {
	        exec_copy($("#run_string").text().replace(/(?:\r\n|\r|\n)/g,''),miru_tool.copied());
  	} catch (err) {
    	  console.error('Fallback: Oops, unable to copy', err);
  	}
	});
	$(".dim_input").on('change',(e) => {
		const de = document.documentElement.style;
		de.setProperty('--ss_top',$('#top').val() );
		de.setProperty('--ss_left',$('#left').val() );
		de.setProperty('--ss_right',$('#right').val() );
		de.setProperty('--ss_bottom',$('#bottom').val());
		console.log('dimensions: top:' + $('#top').val() + ' l:' + $('#left').val() + ' r:'  + $('#right').val() + ' b:' +  $('#bottom').val() );
	});

	mt.show();

	let tgt = false;
	let count = 0;
	document.querySelectorAll('.zminute_DIV').forEach((el) => {
		const $za_imgs = $(el).find('.za_img');
		if ($za_imgs.length > count) {
			tgt =  $za_imgs[0];
			count = $za_imgs.length;
		}
	});

	if (tgt) {
	$(tgt).one('load',(e) => {
		const t = e.currentTarget;
		const $t = $(e.currentTarget);
		const min = t.getAttribute('minute');
		const sc = t.getAttribute('screen');
		var row_height = Math.floor($(`.za_img[minute=${min}][screen=${sc}]`).height() + 1);
		if (Number.isNaN(row_height)) { row_height = 200; }
		document.documentElement.style.setProperty('--minute_height',row_height + "px" );
	}).each(function(){
	if(this.complete) {
		$(this).trigger('load');
	}
	}
	);}
	document.querySelectorAll('.za_DIV').forEach((el)  => {
	   $(el).append('<div class="za_png" >PNG</div>');
	});
	$('.za_png').off('click').on('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		const t = e.currentTarget;
		const $t = $(t);
		mt.png(t.closest('.zminute_DIV').getAttribute('minute'),
			parseInt(($t.parent().attr('screen') -1) * 20));
	});

	image_done(() => { img_compare.run();  });

	const elements = document.querySelectorAll('.zminute_DIV');
	const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
 	const min = entry.target.getAttribute('minute');
  	const me = document.querySelector(`.sb_DIV[minute="${min}"]`); // Use template literals for cleaner selector
  if (entry.isIntersecting && me) { // Check if me exists to avoid errors
    me.classList.add('inview');
  } else if (me) {
    me.classList.remove('inview');
  }
    });
  }, {
    root: null, // Use viewport as root
    rootMargin: '0px', // Margin around the root
    threshold: 0.1 // Trigger when 10% of the element is visible
  });

  elements.forEach(el => observer.observe(el));

});

function image_done(callback) {
  const images = document.querySelectorAll('img');
  let loadedCount = 0;

  if (images.length === 0) {
    callback();
    return;
  }

  images.forEach(img => {
    if (img.complete) {
      loadedCount++;
      if (loadedCount === images.length) callback();
    } else {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) callback();
      };
      img.onerror = () => {
        loadedCount++; // Handle errors to avoid stalling
        if (loadedCount === images.length) callback();
      };
    }
  });
}
