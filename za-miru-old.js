
class Zbase {
	static appendDIV(t,newHTML)
	{
		let y;
		if ( (t instanceof Element)) {
			y = t;
		}
		else {
			y = document.querySelector(t);
		}
		y?.insertAdjacentHTML('beforeend',newHTML);
	}
}

class Zrange extends Zbase {
	constructor(date,hour,cam,start,end,label)
	{
		super();
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
		let date = window.miru_tool.date;
		let cam = "";
		let hour ="";
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

	/**
	 * @param {string} x
	 * @returns {Zrange}
	 **/
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

	cross_reference()
	{
		const item_label_pretty = this.makePrettyLabel();
		Zbase.appendDIV('.other_cams[minute="' + this.start +  '"]','<div class="cam_' + this.cam + ' za_start_weak">' + item_label_pretty + '</div>');
		var i = (this.start *1);
		if (this.end == this.start) { return false; }
		var last_mid = (this.end * 1) -1;
		while (i  < last_mid) {
			i++;
			var i_pretty = String(i).padStart(2, '0')
				Zbase.appendDIV('.other_cams[minute="' + i_pretty +  '"]','<div class="cam_' + this.cam + ' za_continue_weak">' + item_label_pretty + '</div>');
		}
		var i_pretty =  String(this.end * 1).padStart(2, '0')
			Zbase.appendDIV('.other_cams[minute="' + i_pretty +  '"]','<div class="cam_' + this.cam + ' za_end_weak">' + item_label_pretty + '</div>');
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

	/** 
	 * @returns {string}
	 **/
	express_string()
	{
		let clean_label = "blank";
		if (this.label !== undefined) {
			if (this.label) {
				clean_label = this.label.replace(' ','_');
			}
		}
		return "d:" + this.date + ";h:" + this.hour  +  ";c:" + this.cam +  ";s:" + this.start + ";e:" + this.end + ";l:" +  clean_label; 
	}

	/**
	 * @returns {string}
	 **/
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

	/**
	 * @returns {string}
	 **/
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
	minStates:  ['za_start','za_end','za_nothing'],
	minStateCount : 3,
     /**
      * @param {HTMLElement} el
      * @param {string} my_class
      **/
     forceSet:function(el,my_class)
     {
	     el.classList.remove(... this.minStates);
	     el.classList.toggle(my_class);
     },
     /**
      * @param {string} str
      * @param {any} dof
      **/
exec_copy:function(str,dof = false)
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

		  try 	{
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
	  },
	  /**
	   * @param {number} start
	   * @param {number} dir
	   **/ 
findTarget:function(source,dir)
	   {
		   let drow= false;
		   var dest = source;
		   /** search for a place to move to **/
		   while (!drow) {
			   dest = dest + dir;
			   var drow_obj  =  document.querySelector('.zminute_DIV[minute="' + dest.toString().padStart(2,"0") + '"]');
			   if (drow_obj) { drow = drow_obj; }
			   if (dest < 0 ) {  return false; }
			   if (dest > 59 ) { return false; }
		   }
		   return {'dest':dest,'drow':drow};
	   },
shifter:function(e)
	{
		e.preventDefault();
		const mt = window.miru_tool;
		const me = e.currentTarget;
		const move  = me.textContent;
		var my_range = me.parentElement;
		const state =  my_range.getAttribute('state');

		const srow = me.closest('.zminute_DIV');
		const source = srow.getAttribute('minute') * 1;
		let dir = 0;
		switch (move)
		{
			case "Up":dir = - 1; break;
			case "Down": dir=  +1; break;
		}
		let dobj = mt.findTarget(source,dir);
		if (dobj === false) { return false; }
		let dest = dobj.dest;
		let drow = dobj.drow;
		console.log('start with ' + source + ' dest  ' + dest + "and state " + state);
		my_range.querySelectorAll('INPUT').forEach (i => { i.setAttribute('minute',dest); });
		const zmRL = srow.querySelector('.zm_marker .range_label');
		drow.querySelector('.zm_marker').appendChild(zmRL);
		drow.classList.add(state);
		srow.querySelectorAll('.range_label[state="' + state  + '"]').forEach (el => { el.remove(); } );
		srow.classList.remove(state); 
		mt.forceSet( document.querySelector('.sb_DIV[minute="' + source.toString().padStart(2,"0") + '"]'),'za_nothing');
		mt.forceSet( document.querySelector('.sb_DIV[minute="' + dest.toString().padStart(2,"0") + '"]'),state);
		mt.updateBar();
	},
	/**
	 * param {HTMLElement} mxt
	 */
bindShift:function(mxt)
	  {
		  mxt.querySelectorAll('.shifter').forEach( bs => 
				  {
				  if (bs._click) {  bs.removeEventListener('click',bs._click);  }
				  bs._click = this.shifter;
				  bs.addEventListener('click',bs._click);
				  });
	  },
	  /**
	   * @returns {string}
	   **/
shiftHTML:function()
	  {
		  return '<button class="shifter">Up</button><button class="shifter">Down</button>';
	  },
	  /**
	   * @param {number} minute
	   * @param {string} value
	   **/
startHTML:function(minute,value)
	  {
		  const mxt = document.querySelector('.zminute_DIV[minute="' + minute + '"] .zm_marker');
		  Zbase.appendDIV(mxt,'<div class="range_label" state="za_start"><input class="rl_name"  minute="' + minute + '" value="' + value + '" />' + 
				  this.shiftHTML() + '</div>');
		  this.bindShift(mxt);
	  },
endHTML:function(minute)
	{
		const mxt = document.querySelector('.zminute_DIV[minute="' + minute + '"] .zm_marker');
		Zbase.appendDIV(mxt,'<div class="range_label" state="za_end">'  + this.shiftHTML() + '<div>');
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
		     const clear_click =  (e) => { this.clear_all(e); } ;
		     document.querySelectorAll('.clearer').forEach (cl => {
			if (cl._click) {  cl.removeEventListener('click', cl._click); }
		     	cl._click = clear_click ;
		     	cl.addEventListener('click',clear_click); 
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
this.ic = new imgComparer(this.cam);
},
	/**
	 * @param {number} idx
	 * @returns {string}
	 **/
findNeighborURL:function(offset) {
			return   "/" + this.date + '-' + ((this.cam * 1) + offset) + '/screens' + ("00" +  this.hour).slice(-2)  + '.html';

		},
prev_feed:function(e) {
		  e.preventDefault();
		  generate_ranges();
		  if (this.cam > 1) {
			  window.location.href = this.findNeighborURL(-1);
		  } else { alert('not yet implemented'); }
	  },
next_feed:function(e) {
		  e.preventDefault();
		  generate_ranges();
		  if (this.cam < this.max_cam_count ) {
			  window.location.href = this.findNeighborURL(1);
		  }
	  },
load:function()
{
	let x=   localStorage.getItem("zaday");
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
	/** 
	 * @param {string} value
	 **/
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
	/**
	 * @param {number} min
	 * @param {number} sec 
	 **/
png:function(min,sec)
{
	window.miru_tool.exec_copy('sudo zsh za-png.sh d='  + this.date   + ' cam=' + this.cam + ' h=' + this.hour + ' min=' + min + ' sec=' + sec);
},
updateBar:function()
{
	console.log('update bar called');
	document.querySelectorAll(".zminute_DIV").forEach( el => {
			const minute = el.getAttribute('minute');
			var match_classes = ' ' + el.className.replace('zminute_DIV','');
			document.querySelectorAll(".sb_DIV").className = 'sb_DIV' + match_classes;
			});

},
generateBar:function()
{
	console.log("generating select bar");
	document.getElementById("select_bar")?.remove();
	document.getElementById("ranges").insertAdjacentHTML('afterbegin', '<div id="select_bar"></div>');
	const sBar =  document.getElementById("select_bar");
	Zbase.appendDIV(sBar,'<div class="output_hour">Jump</div>');
	document.querySelectorAll(".zminute_DIV").forEach( el => {
			const minute = el.getAttribute('minute');
			var match_classes = ' ' + el.className.replace('zminute_DIV','');
			Zbase.appendDIV(sBar,'<div class="sb_DIV' + match_classes  + '" id="sb_' + minute + '" minute="' + minute + '" style="--minute:' + minute +  '">' +
					'<a class="MIN_jumper">' + minute + '</a></div>');
			});
	document.querySelectorAll(".MIN_jumper").forEach(mj => {
			mj.addEventListener('click', (e) => {
					e.preventDefault();
					const targetMinute = e.currentTarget.textContent.trim();
					const targetElement = document.querySelector(`.zminute_DIV[minute="${targetMinute}"]`);
					if (targetElement) {
					const scrollTarget = targetElement.getBoundingClientRect().top + window.pageYOffset;
					window.scrollTo({
top: scrollTarget,
behavior: 'smooth'
});
					}
					});
			});
document.querySelectorAll('.za_minute').forEach(el => { el.classList.add('za_nothing'); });
this.ic.highlight();
},
	findEarlier(minute)
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
},
toggleSet:function(el) {
		  const mt = window.miru_tool;
		  const minute = Number(el.getAttribute('minute'));

		  // Find current class index
		  const currentClass = [...el.classList].find(cls => mt.minStates.includes(cls));
		  const currentIndex = currentClass ? mt.minStates.indexOf(currentClass) : -1;

		  if (currentClass === "za_start") {
			  const rangeName = el.querySelector('.rl_name')?.value?.trim();
			  if (rangeName) {
				  el.setAttribute('range_label', rangeName);
			  }
		  }

		  //if we are in a block, we end; if we are not in a block we start
		  const priorClass = mt.findEarlier(minute);
		  let nextIndex = (currentIndex + 1) % mt.minStates.length;

		  if (mt.minStates[nextIndex] === priorClass) {
			  nextIndex = (currentIndex + 2) % mt.minStates.length;
		  }

		  const nextClass = mt.minStates[nextIndex];
		  mt.forceSet(el, nextClass);
	  }
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

function getRangeName(minute)
{
	// Select the input with attribute minute="..."
	const input = document.querySelector(`.range_label input[minute="${minute}"]`);
	if (input) {
		const rrange = input.value;
		if (typeof rrange !== "undefined" && rrange !== "") {
			return rrange.replace(/ /g, "_");
		}
		return "no name";
	}

	console.log("failed on" + `.range_label input[minute="${minute}"]`);
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
			rangeName = getRangeName(minute);
			mt.make_range(ranges,minute,minute,rangeName,cam);
			}

			}
			else if (hasStart) {
			console.log('minute start');
			first_minute = minute;
			}
			else if (hasEnd) {
			rangeName = getRangeName(first_minute);
			mt.make_range(ranges,first_minute,minute,rangeName,cam);
			first_minute = false;
			}

	});

	if (first_minute) {
		console.log("determined final block is active");
		rangeName = getRangeName(first_minute);
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
			if (!last_start) { last_start = current_start; last_end =  current_end; last_name_range = range_name; }
			else { 
			if (current_start == (last_end + 1)) {
			last_end = current_end;
			} else {
			mt.make_range(clean_ranges,last_start,last_end,last_range_name,cam);
			last_start = current_start; last_end =  current_end; last_name_range = range_name;
			}
			}
			console.log(clean_ranges);
			});

	if (last_start) {
		mt.make_range(clean_ranges,last_start,last_end,last_name_range,cam);
	}
	console.log(clean_ranges);
	mt.update_ranges(clean_ranges);
	mt.show();
}



function toggle_state(minute)
{
	const mt = window.miru_tool;
	const mxt = document.querySelector('.zminute_DIV[minute="' + minute + '"]');
	mt.toggleSet( document.querySelector('.sb_DIV[minute="' + minute + '"]'));
	mt.toggleSet(mxt);
	mxt.querySelectorAll('.zm_marker .range_label').forEach( el => { el.remove(); });

	if (mxt.classList.contains('za_start')) {
		var value = "";
		if (mxt.hasAttribute('range_label')) {
			value = mxt.getAttribute('range_label');
		}
		mt.startHTML(minute,value);
	} else if (mxt.classList.contains('za_end'))  {
		mt.endHTML(minute);
	}
}



class heatMap {
	modifier(i)
	{
		const spot = i / 4;
                if (this.map.data[spot]) { 
			const heatLevel = this.map.data[spot];
			if (heatLevel != 100) { this.heatUse++; }
			return heatLevel;
		} else { 
			if (spot != 0) {
			console.log('not defined at ' + spot);
			fdafsa
			}
  		}
                return 100;
	}
	constructor(cam) {
		this.cam = cam;
		this.WIDTH = 192;
		this.HEIGHT = 108;
		this.CELL_SIZE = 3;
		this.TOTAL = this.WIDTH * this.HEIGHT;
		this.heatUse =0;
		this.map = this.loadMap();

		// Canvases
		this.bgCanvas = null;
		this.bgCtx = null;
		this.canvas = null;
		this.ctx = null;

		this.imageData = null;
		this.buf = null;


		this.goGroup = {
			'Plus' : [
				100,  // 0 → neutral → FULLY TRANSPARENT
			160,  // 1 → +1 light green
			220  // 2 → +2 strong green
			],
			'Minus' : [
				100,  // 0 → neutral → FULLY TRANSPARENT
			80,   // 3 → -1 light red
			40    // 4 → -2 strong red
			]
		};
		this.curGo = 'Plus';
	}

	setCss(x) {
		x.width = this.WIDTH * this.CELL_SIZE;
		x.height = this.HEIGHT * this.CELL_SIZE;
		x.style.imageRendering = 'pixelated';
		x.style.border = '3px solid #444';
		x.style.display = 'block';
		x.style.margin = '10px auto';
		x.style.position = 'absolute';
		x.style.bottom = '0';
	}

	drawBackgroundOnce() {
		const img = document.querySelector('.za_img');
		if (!img || !img.complete || img.naturalWidth === 0) {
			img.onload = () => this.drawBackgroundOnce();
			return;
		}
		this.bgCtx.drawImage(img, 0, 0, this.bgCanvas.width, this.bgCanvas.height);
	}

	setupOverlayBuffer() {
		this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
		this.buf = new Uint32Array(this.imageData.data.buffer);
		this.buf.fill(0); // fully transparent
	}

	setupEventListeners() {
		const handleClick = (e) => {
			e.preventDefault();
			const cell = this.getCell(e);
			if (cell)  this.paintNeighbors(cell);  
		};

		let isDragging = false;
		const tc = this.canvas;
		tc.addEventListener('mousedown', (e) => {
				isDragging = true;
				handleClick(e);
				});
		tc.addEventListener('mousemove', (e) => {
				if (isDragging) handleClick(e);
				});
		tc.addEventListener('mouseup', () => isDragging = false);
		tc.addEventListener('mouseleave', () => isDragging = false);
		tc.addEventListener('click', handleClick);
		tc.addEventListener('contextmenu', e => e.preventDefault());

		document.getElementById('mapReset').addEventListener('click' , (e) =>  {
				e.preventDefault();
				this.resetMap();
				this.render();

				});
	}

	xyiObj(x,y)
	{
		if (x >= 0 && x < this.WIDTH && y >= 0 && y < this.HEIGHT) {
			return { x, y, index: y * this.WIDTH + x };
		}
		return null;
	}

	getCell(e) {
		const rect = this.canvas.getBoundingClientRect();
		const x = Math.floor((e.clientX - rect.left) / this.CELL_SIZE);
		const y = Math.floor((e.clientY - rect.top) / this.CELL_SIZE); 
		return this.xyiObj(x,y);
	}

	paintCell(cell) {
		if  (cell === null) { return false; }
		const currentIdx = this.goGroup[this.curGo].indexOf(this.map.data[cell.index]);
		const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % this.goGroup[this.curGo].length;
		if (nextIdx > currentIdx) {
			this.map.data[cell.index] = this.goGroup[this.curGo][nextIdx];
			this.render();           // redraw entire overlay (fast enough)
		}
		this.saveToStorage();
	}

	paintNeighbors(cell)
	{
		this.paintCell(cell);

		const neighbors = [
		{ x: cell.x-1, y: cell.y-1 }, { x: cell.x-1, y: cell.y   }, { x: cell.x-1, y: cell.y+1 },
		{ x: cell.x,   y: cell.y-1 },                    { x: cell.x+1,   y: cell.y+1 },
		{ x: cell.x+1, y: cell.y-1 }, { x: cell.x+1, y: cell.y   }, { x: cell.x+1, y: cell.y+1 },
		];
		neighbors.forEach(n => {
				this.paintCell(this.xyiObj(n.x,n.y));
				});

	}

	drawCell(x, y, value) {
		let r, g, b, a = 0;  // default = fully transparent

		switch (value) {
			case 100: // ← NEUTRAL = 100% TRANSPARENT (photo shows through)
				a = 0;
				break;

			case 160: // +1 → light green
				r = 100; g = 255; b = 100; a = 90;
				break;

			case 220: // +2 → strong green
				r = 50;  g = 255; b = 50;  a = 160;
				break;

			case 80:  // -1 → light red
				r = 255; g = 130; b = 130; a = 90;
				break;

			case 40:  // -2 → strong red
				r = 255; g = 70;  b = 70;  a = 170;
				break;

			default:
				a = 0; // anything unknown = transparent
		}

		// If fully transparent, skip writing pixels (faster + cleaner)
		if (a === 0) {
			const sx = x * this.CELL_SIZE;
			const sy = y * this.CELL_SIZE;
			for (let dy = 0; dy < this.CELL_SIZE; dy++) {
				const row = (sy + dy) * this.canvas.width;
				for (let dx = 0; dx < this.CELL_SIZE; dx++) {
					this.buf[row + sx + dx] = 0; // 0 = transparent black
				}
			}
			return;
		}

		// Colored overlay (ABGR order)
		const color = (a << 24) | (b << 16) | (g << 8) | r;

		const sx = x * this.CELL_SIZE;
		const sy = y * this.CELL_SIZE;
		for (let dy = 0; dy < this.CELL_SIZE; dy++) {
			const row = (sy + dy) * this.canvas.width;
			for (let dx = 0; dx < this.CELL_SIZE; dx++) {
				this.buf[row + sx + dx] = color;
			}
		}
	}

	render() {
		this.buf.fill(0); // clear overlay
		for (let i = 0; i < this.TOTAL; i++) {
			const x = i % this.WIDTH;
			const y = Math.floor(i / this.WIDTH);
			this.drawCell(x, y, this.map.data[i]);
		}
		this.ctx.putImageData(this.imageData, 0, 0);
	}


	showMap(container = document.body) {
		[this.bgCanvas, this.canvas].forEach(c => c?.parentNode?.removeChild(c));

		// Background canvas (underneath)
		this.bgCanvas = document.createElement('canvas');
		this.bgCanvas.width = this.WIDTH * this.CELL_SIZE;
		this.bgCanvas.height = this.HEIGHT * this.CELL_SIZE;
		this.bgCtx = this.bgCanvas.getContext('2d');

		// Foreground interactive canvas
		this.canvas = document.createElement('canvas');
		this.setCss(this.canvas);
		this.ctx = this.canvas.getContext('2d');

		// Wrapper to stack them perfectly
		const wrapper = document.createElement('div');
		wrapper.id = 'map_' + this.cam;
		wrapper.style.position = 'relative';
		wrapper.style.width = this.canvas.width + 'px';
		wrapper.style.height = this.canvas.height + 'px';
		wrapper.style.margin = '10px auto';


		this.setCss(this.bgCanvas);
		wrapper.appendChild(this.bgCanvas);
		wrapper.appendChild(this.canvas);  // interactive layer on top


		const resetB = document.createElement('button');
		resetB.innerHTML = 'Reset';
		resetB.id = 'mapReset';
		resetB.style.position = 'absolute';
		resetB.style.right = '-20px';
		wrapper.appendChild(resetB);

		container.appendChild(wrapper);

		this.drawBackgroundOnce();
		this.setupOverlayBuffer();
		this.render();
		this.setupEventListeners();
	}

	loadMap() {
		const key = 'camMap' + this.cam;
		const mapJSON = localStorage.getItem(key);

		if (mapJSON) {
			try {
				const parsed = JSON.parse(mapJSON);
				// Validate structure
				if (parsed.w === this.WIDTH && parsed.h === this.HEIGHT && Array.isArray(parsed.data) && parsed.data.length === this.TOTAL) {
					return {
w: this.WIDTH,
	   h: this.HEIGHT,
	   data: Uint8Array.from(parsed.data) // faster + clamped 0–255
					};
				}
			} catch (e) {
				console.warn(`Failed to parse map for cam ${this.cam}`, e);
			}
		}

		return this.defaultMap();
	}

	defaultMap() {
		return {
w: this.WIDTH,
	   h: this.HEIGHT,
	   data: new Uint8Array(this.TOTAL).fill(100) // Uint8Array = better than regular array
		};
	}

	resetMap() 
	{
		this.map = this.defaultMap();
		this.setupOverlayBuffer();
		this.saveToStorage();
	}  

	saveToStorage() {
		const key = 'camMap' + this.cam;
		const saveable = {
	w: this.WIDTH,
   	h: this.HEIGHT,
   data: Array.from(this.map.data) // convert Uint8Array → normal array
		};
		localStorage.setItem(key, JSON.stringify(saveable));
	}

	// Optional: expose current map as JSON
	exportJSON() {
		return {
w: this.WIDTH,
	   h: this.HEIGHT,
	   data: Array.from(this.map.data)
		};
	}
}

class imgComparer
{

	/**
	 * @param {number} cam
	 **/
	constructor(cam)
	{
		this.cam = cam;
		this.scale = 0.1;
		this.parts = [];
		this.sensitivity = 10;
		this.base_width = 1920;
		this.base_height = 1080;
		this.img_count = 3;
		this.iwidth = 0;
		this.iheight = 0;
		this.scaleWidth =  this.base_width  * this.scale; 
		this.scaleHeight = this.base_height * this.scale;
		this.pwidth = this.scaleWidth / 3;
		this.pheight =  this.scaleHeight / 3;
		this.smap = [];
		this.debug = false;
		this.heatMap = new heatMap(cam);
		this.buildNinthMap();
	}
	log(x)
	{
		if (this.debug) {	console.log(x); }
	}


buildNinthMap() {
    const totalPixels = this.scaleWidth * this.scaleHeight;
    this._ninthMap = new Array(totalPixels);  // or Uint8Array for codes if you want to save space

    for (let row = 0; row < this.scaleHeight; row++) {
        const v = row > 2 * this.pheight ? 'b' :
                  row >     this.pheight ? 'm' : 't';

        for (let col = 0; col < this.scaleWidth; col++) {
            const h = col > 2 * this.pwidth ? 'r' :
                      col >     this.pwidth ? 'c' : 'l';

            const spot = row * this.scaleWidth + col;
            this._ninthMap[spot] = v + h;
        }
    }
}

whichNinth(i) 
{
    const spot = i >> 2;  // i / 4 | 0
    return this._ninthMap[spot];
}

	run()
	{
		const c = [];
		this.iwidth = this.base_width * this.scale;
		this.iheight = this.base_height * this.scale;
		const iwidth = this.iwidth;
		const iheight = this.iheight;
		const dmap = [] 

			/** create two canvases for running the image comparison, append them to the bottom of the document **/
			for (var i = 0; i <= 1;  i++) 
			{
				Zbase.appendDIV(document.body, '<canvas width="' + iwidth +  '" height="' + iheight +'"  id="c' + i +  '"></canvas>');
				c[i] = document.getElementById('c' + i).getContext('2d',{willReadFrequently: true});
			}
		let run = 0; /* track run count */
		for (let min = 0; min <=59; min++) { /*loop over full range of minutes and screens */
			for (let screen = 1; screen <= window.miru_tool.imgCount; screen++) {
				const fmnt = ("00" + min).slice(-2);
				const fscreen = ("000" + screen).slice(-3) ;
				const squery = '.za_img[minute="' + fmnt +  '"][screen="' + fscreen + '"]'; 
				this.log('loaded img at '  + squery);
				const img_obj = document.querySelector(squery);
				if (!img_obj) { continue;  }
				run++;
				c[run % 2].drawImage(img_obj,0,0,iwidth,iheight);
				this.eightbit(c[run %2]);

				if (run == 1) { continue;  }
				var dpit  =  this.compare(c[0].getImageData(0,0,iwidth,iheight).data,c[1].getImageData(0,0,iwidth,iheight).data);
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
	}
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
				document.querySelector('.sb_DIV[minute="' + sc.min + '"]')?.style.setProperty('--dsize_' + sc.screen,sc.dsize + '');
				});
		console.log(this.smap);
		this.smap.sort((a,b) =>  b.dsize - a.dsize).slice(0,10).forEach((sc,index) => {
				document.querySelectorAll('.sb_DIV[minute="' + sc.min + '"]').forEach( sbd => {
						sbd.setAttribute('stype','motion')
						sbd.setAttribute('marea',sc.region[0]);
						sbd.setAttribute('yarea',sc.region[1]);
						});
				const sce =  document.querySelector(sc.squery);
				sce.setAttribute('stype','motion');
				sce.setAttribute('marea',sc.region[0]);
				sce.setAttribute('yarea',sc.region[1]);
				const sp = sce.parentElement;
				sp.setAttribute('marea',sc.region[0]);
				sp.setAttribute('yarea',sc.region[1]);
				});
		document.getElementById('ranges').style.setProperty('--maxd',ds2 + '');  //use the second highest value
		console.log('set maxd to ' + ds2 );
	}
	calcDiff(a,b,i)
	{
            return (Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2])) * this.heatMap.modifier(i);
	}
	compare(a,b)
	{
		let diff = 0;
		let dsize = 0;
		let last_reg = false;
		var regions = { 'tl' : 0, 'tc':0, 'tr':  0 , 'ml': 0, 'mc' :0, 'mr' :0,  'bl' : 0 , 'bc': 0,  'br' : 0 };
		for(var i = 0, il = a.length; i < il; i +=4) 
		{ 
		/** pixel by pixel identify differences up to sensitivity and add their magnitude **/
			const  ds1 =  this.calcDiff(a,b,i);
			if  (ds1 > this.sensitivity) { 
				diff++;
				dsize += ds1;
				const my_reg = this.whichNinth(i);
				if (last_reg != my_reg) {
					last_reg = my_reg;
				}
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
	}

	eightbit(ctx) {
		var imgdata = ctx.getImageData(0,0,this.base_width * this.scale, this.base_height * this.scale); // get data
		var data = imgdata.data; // bytes
		const crange= 8;
		// 8-bit: rrr ggg bbb
		for(var i = 0; i < data.length; i += 4) {
			data[i]     = this.nearest(data[i],     crange); // set value to nearest of 8 possibilities
			data[i + 1] = this.nearest(data[i + 1], crange);
			data[i + 2] = this.nearest(data[i + 2], crange);
		}

		ctx.putImageData(imgdata, 0, 0); // put image data to canvas
	}
	nearest(x, a) {
		// will round down to nearest of a possibilities in the range 0 <= x <= 255
		return Math.floor(x / (255 / a)) * (255 / a);
	}
}

document.addEventListener('DOMContentLoaded', () => {
		const mt = window.miru_tool;
		mt.init();
		document.querySelectorAll(".zminute_DIV").forEach( zm => 
		{
				const minute = zm.getAttribute('minute');
				Zbase.appendDIV(zm.querySelector('.zm_marker'),'<div class="other_cams" minute="' + minute  + '"></div>');
				});

		mt.imgCount =  document.querySelector('.zminute_DIV').querySelectorAll('img').length;
		mt.imgGap = Math.floor(60 / mt.imgCount);
		document.querySelectorAll('.generator').forEach (g => { g.addEventListener('click',(e) => {  generate_ranges(); } ); });

		const cam7 = document.querySelector('.cam7');
		cam7.innerHTML = 'Send';
		cam7.addEventListener('click',(e) =>  {
				fetch('/cgi-bin/za-horu.cgi?d=' + mt.date  + '&h=' + mt.hour  +  '&i="' + encodeURIComponent(document.getElementById("real_string").innerHTML) + '"' )
				.then(response => {
						if (!response.ok) {
						throw new Error('Network response was not ok: ' + response.statusText);
						} else {
						document.getElementById("run_string").setAttribute('state','sent');
						}
						return response.json(); // or response.text(), depending on the response type
						})
				.then(data => console.log('Response:', data))
				.catch(error => console.error('Request failed:', error));
				});
		document.querySelector('.copyit').addEventListener('click',(e) =>  {
				try {
				window.miru_tool.exec_copy(document.getElementById("run_string").textContent.replace(/(?:\r\n|\r|\n)/g,''),miru_tool.copied());
				} catch (err) {
				console.error('Fallback: Oops, unable to copy', err);
				}
				});
		document.querySelectorAll(".dim_input").forEach(di => {
				di.addEventListener('change',(e) => {
						const de = document.documentElement.style;
						de.setProperty('--ss_top',document.getElementById('top').value );
						de.setProperty('--ss_left',document.getElementById('left').value );
						de.setProperty('--ss_right',document.getElementById('right').value );
						de.setProperty('--ss_bottom',document.getElementById('bottom').value);
						});});

		mt.show();

		let tgt = false;
		let count = 0;
		document.querySelectorAll('.zminute_DIV').forEach((el) => {
				const za_imgs = el.querySelectorAll('.za_img');
				if (za_imgs.length > count) {
				tgt =  za_imgs[0];
				count = za_imgs.length;
				}
				});

		if (tgt) {
			[tgt].forEach(t => {
					// Helper: trigger load if image is already cached
					const triggerLoadIfComplete = (img) => {
					if (img.complete && img.naturalWidth !== 0) {
					handleLoad({ currentTarget: img });
					}
					};

					// Main load handler
					const handleLoad = (e) => {
					const img = e.currentTarget;
					const min = img.getAttribute('minute');
					const sc = img.getAttribute('screen');

					// Find matching .za_img element
					const matcher = `.za_img[minute="${min}"][screen="${sc}"]`;
					const zaImg = document.querySelector(matcher);
					let row_height = zaImg ? Math.floor(zaImg.offsetHeight + 1) : NaN;

					if (Number.isNaN(row_height)) {
					row_height = 200;
					}

					document.documentElement.style.setProperty('--minute_height', row_height + 'px');
					};

					// Attach load event (fires once)
					t.addEventListener('load', handleLoad, { once: true });

					// Check if already loaded (cached images)
					triggerLoadIfComplete(t);
			});

		}

		document.querySelectorAll('.za_DIV').forEach((el)  => {
				Zbase.appendDIV(el,'<div class="za_png" >PNG</div>');
				});

		const png_click = (e) =>  {
			e.preventDefault();
			e.stopPropagation();
			const t = e.currentTarget;
			mt.png(t.closest('.zminute_DIV').getAttribute('minute'),
					parseInt((t.parentElement.getAttribute('screen') -1) * (mt.imgGap)));
		};
		document.querySelectorAll('.za_png').forEach(pl =>  {
				pl.addEventListener('click',png_click);
				});

		image_done(() => { mt.ic.run();  });

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


const za_click =   (e) => {
	const minute = e.currentTarget.parentElement.getAttribute('minute');
	toggle_state(minute);
};
document.querySelectorAll(".za_DIV").forEach( el => {
		el.addEventListener('click',za_click);
		});

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
