var za_classes = ['za_start','za_end','za_nothing'];
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
    var pieces  = mux.split(';');
    var date = miru_tool.date;
    var cam = "";
    var hour ="";
    pieces.forEach(function(item){
        var smallp = item.split(':');
        switch (smallp[0]) {
                case "h": hour = smallp[1];  break;
                case "d": date = smallp[1];  break;
                case "c": cam = smallp[1];      break;
        }
    });
	var y = [];
	x.forEach(function(item){
		y.push(  new Zrange(date,hour,cam,item["start"],item["end"],item["label"]));
	});
	return  y;
  }

  static from_string(x)
  {
    var pieces	= x.split(';');
    var cam = ""; var hour = ""; var date = ""; var start = ""; var end = ""; var label = "";
    pieces.forEach(function(item){
 	var smallp = item.split(':');
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

  cross_reference()
  {
                var item_label_pretty = this.label.replace(/_/g," ");
                $('.other_cams[minute="' + this.start +  '"]').append('<div class="cam_' + this.cam + ' za_start_weak">' + item_label_pretty + '</div>');
                var i = (this.start *1);
                if (this.end == this.start) { return false; }
		var last_mid = (this.end * 1) -1;
                while (i  < last_mid) {
                        i++;
                        var i_pretty = String(i).padStart(2, '0')
                        $('.other_cams[minute="' + i_pretty +  '"]').append('<div class="cam_' + this.cam + ' za_continue_weak">' + item_label_pretty + '</div>');      
                }
                var i_pretty =  String(this.end * 1).padStart(2, '0')
               $('.other_cams[minute="' + i_pretty +  '"]').append('<div class="cam_' + this.cam + ' za_end_weak">' + item_label_pretty + '</div>');
	}

 self_reference()
{
                var item_label_pretty = this.label.replace(/_/g," ");
                var i_pretty =  String(this.start * 1).padStart(2, '0')
                $(".zminute_DIV[minute=" + i_pretty + "] .zm_marker .range_label").remove();
                $(".zminute_DIV[minute=" + i_pretty + "]").addClass('za_start');
                range_start_html(i_pretty,item_label_pretty);
                i_pretty =  String(this.end * 1).padStart(2, '0');
                $(".zminute_DIV[minute=" + i_pretty + "]").addClass('za_end');
		if (this.end > this.start) {
                	$(".zminute_DIV[minute=" + i_pretty + "] .zm_marker .range_label").remove();
                	range_end_html(i_pretty);
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
	    var clean_label = this.label.replace(' ','_');
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

const miru_tool = 
{
	date:false, 
	cam: false,
	max_cam_count : 7,
	hour:false,
	copied:function()
	{
		$("#run_string").attr('state','copied');
	},
	init:function()
	{
	        this.date = $(".za_top_DIV").attr('day');
	        this.cam = $(".za_top_DIV").attr('cam');
        	this.hour = $(".za_top_DIV").attr('hour');
        	$(".za_top_DIV").addClass("cam_" + this.cam); 
		if (document.getElementsByClassName("clear1").length == 0) {
			$(".range_tools").append('<div class="clear1" onclick="miru_tool.clear1()" >Clear 1</div>');
			$(".clearer").off('click').on('click',this.clear_all);
		}
		$('BODY').append('<PRE style="display:none"  id="real_string"></PRE>');
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
        	var all_ranges = miru_tool.load();
        	if (!all_ranges)  { all_ranges = {} }
        	all_ranges["h:" + miru_tool.hour + ";c:" +  miru_tool.cam ] = clean_ranges;
        	console.log("updated to " + all_ranges);
        	miru_tool.store(all_ranges);
	},
	store: function(value)
	{
		console.log(" saved " + value);
	        localStorage.setItem('zaday',JSON.stringify(value));
	},
	clear1:function()
	{
		var all_ranges = this.load();
        	if (!all_ranges) {  	return false; }
		delete all_ranges["h:" + this.hour + ";c:" + this.cam];
		this.store(all_ranges);
		$(".zminute_DIV").removeClass('za_start , za_end');
		$(".range_label").remove();
		miru_tool.show();
	},
	clear_all:function()
	{
		miru_tool.store({});
		$('#ranges').html('<div id="select_bar"></div>');
		  generate_select_bar();
  		$('#run_string').html('').attr('state','clear');
	},
	show:function()
	{

        var all_ranges = miru_tool.load();
        if (!all_ranges) {  all_ranges  = []; }
        var my_string = "";
        var cam = miru_tool.cam; 
        var this_hour = "h:" + miru_tool.hour;
        var html_output = "";

        $('.other_cams').empty();
        for(var hour in all_ranges)
        {
		console.log("entry" + all_ranges[hour]);
                var zr = Zrange.from_JSON(hour,all_ranges[hour]);
		my_string +=  hour + '>';
 		var piece_count = 0;
		var my_html = [];
		zr.forEach(function(item){
			piece_count++; 
			if (piece_count > 1) { my_string += ","; }
			my_string +=   item.express_string(); 
			my_html.push( item.express_html());
			item.reference(miru_tool.hour,miru_tool.cam);
			console.log("pushed piece " + my_string);
		});
		my_string += "V\n";
		html_output +=   '<div class="output_row">' + zr[0].hour_label()  +  my_html.join('') + '</div>';
                console.log(my_string);
        }
        var day = miru_tool.date;
        $('#ranges').html( html_output);
        generate_select_bar();
        $('#run_string').html('sudo zsh za-horu.sh d=' + day  + '  i="' + my_string + '"');
	$("#real_string").html(my_string);
	},
	png:function(min,sec)
	{
	  exec_copy('sudo zsh za-png.sh d='  + miru_tool.date   + ' cam=' + miru_tool.cam + ' h=' + miru_tool.hour + ' min=' + min + ' sec=' + sec);
	}

}


function ungroup(zgroup)
{
	console.log("unstack on " + $(this).attr('zgroup'));
	$('.zminute_DIV[zgroup=' + zgroup  + ']').css('position','relative').css('margin-top',0).attr('zgm',0);

}


function faster_look(group_size)
{
	var item_count = 0;
	var row_height = Math.floor($(".zminute_DIV[minute=00]").outerHeight() );
        document.documentElement.style.setProperty('--zminute_height',(row_height + 1) + "px" );

	$(".zminute_DIV").each(function(){
		var group = Math.floor(item_count / group_size);
		var num_in_group = item_count - ((group)  *  group_size);
		$(this).attr('zgroup',group);
		$(this).attr('zgm',num_in_group + 1);
		if (num_in_group > 0) {
			$(this).css('position','absolute');
			$(this).css('margin-top','-' + (row_height) + 'px');
		}
		$(this).off('click').on('click',function(e){
			e.preventDefault();
  			ungroup($(this).attr('zgroup'));
					});
		item_count++; 
	});
}


function make_range(ranges,start,end, label,cam)
{
   ranges.push (new  Zrange(miru_tool.date,miru_tool.hour,cam,start,end,label));
}


function zsh_decode(my_ranges)
{
       var  zsh_output = [];
        my_ranges.forEach(
	function(item){
                zsh_output.push( item.express_string());
        });
        return zsh_output.join(',');

}





function get_range_name(minute)
{
	if ($('.range_label INPUT[minute="' + minute +  '"]')) {
		var rrange  = $('.range_label INPUT[minute="' + minute +  '"]').val();
		if (rrange != "") { 
			return rrange.replace(/ /g,"_"); 
		}
		return "no name";
	}
	console.log("failed on" + '.range_label INPUT[minute="' + minute +  '"]' ); 
	return false;
}

function generate_ranges()
{
	console.log("started range generator");
	var ranges = [];
	var first_minute = false;
	var tight_interval = 1;
	var range_name = false;

        var cam = miru_tool.cam;
	$('.zminute_DIV').each(function(){
	    var minute = $(this).attr('minute');
		if ($(this).hasClass('za_start za_end')) {
			if (!first_minute) {
			   var range_name = get_range_name(minute);
			   make_range(ranges,minute,minute,range_name,cam);
			}

		} else
		if ($(this).hasClass('za_start')) { first_minute = minute; }
		else if ($(this).hasClass('za_end')) {
			var range_name = get_range_name(first_minute);
			make_range(ranges,first_minute,minute,range_name,cam);
			first_minute = false;
			range_name = false;
		}

	});

	if (first_minute) {
		console.log("determined final block is active");
        	var range_name = get_range_name(first_minute);
		make_range(ranges,first_minute,59,range_name,cam);
	 }


	if (ranges.length == 0) {
		alert("no ranges marked for camera #" + cam  + "\n Stopping Range Generation");
		return false; 
	}

	console.log("tidying ranges");
	var hour = miru_tool.hour;
	var clean_ranges = [];
	var last_start = false;
	var last_end = false;
	var last_name_range =false;
	ranges.forEach(
	function (item,index) {
		console.log(item);
		var current_start = item.start;
		var current_end = item.end;
	        var range_name  = item.label;
		console.log("with " + item.start + " to " + item.end);
		if (!last_start) { last_start = current_start; last_end =  current_end; last_range_name = range_name; }
		else { 
		   if (current_start == (last_end + 1)) {
			last_end = current_end;
		   } else {
			make_range(clean_ranges,last_start,last_end,last_range_name,cam);
			last_start = current_start; last_end =  current_end; last_range_name = range_name;
		   }
		}
		console.log(clean_ranges);
	});

	if (last_start) {
		make_range(clean_ranges,last_start,last_end,last_range_name,cam);
	}
	console.log(clean_ranges);
	miru_tool.update_ranges(clean_ranges);
	miru_tool.show();
}


function find_before(minute)
{
	var search_min =  minute -1;
	while (search_min >= 0 ) {
    		var s = search_min.toString().padStart(2,"0");
		var test = $(".zminute_DIV[minute=" + s + "]");
		if (test.hasClass('za_end')) { return 'za_end'; }
                if (test.hasClass('za_start')) { return 'za_start'; }

		search_min = search_min - 1;
	}
	return "za_end";
}

function toggle_set(el)
{
	var current_za_class = za_size -1;
	var priorClass = find_before($(el).attr('minute')*1);
	var default_target = 'za_start';

	za_classes.forEach(
	function(item,index)
	{
	   if ($(el).hasClass(item)) {
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
        $(el).removeClass(za_classes.join(' '));
        $(el).toggleClass(my_class); 
}

function shifter(e)
{
        e.preventDefault();
	var shifter = $(this).text();
	var my_range = $(this).parent();
	var source = $(this).closest('.zminute_DIV').attr('minute') * 1;
	switch (shifter)
	{
             case "Up":var dest = source - 1; break;
             case "Down":var dest = source +1; break;
	}
	var dest = dest.toString().padStart(2,"0");
	var source = source.toString().padStart(2,"0");
	var srow = $('.zminute_DIV[minute=' +  source + ']');
	var drow = $('.zminute_DIV[minute=' + dest + ']');
   	var state =  my_range.attr('state');
        console.log('start with ' + source + ' dest  ' + dest + "and state " + state);
	my_range.find('INPUT').attr('minute',dest);
	my_range.appendTo(drow.find('.zm_marker'));
	drow.addClass(state);
	srow.remove('.range_label[state=' + state  + ']').removeClass(state); 

	force_set( $('.sb_DIV[minute=' + source + ']'),'za_nothing');
	force_set( $('.sb_DIV[minute=' + dest + ']'),state);
}


function range_start_html(minute,value)
{
        var mxt = $('.zminute_DIV[minute=' + minute + ']');
        mxt.find('.zm_marker').append('<div class="range_label" state="za_start"><input class="rl_name"  minute="' + minute + '" value="' + value + '" /><button class="shifter">Up</button><button class="shifter">Down</button>');
        mxt.find('.shifter').on('click',shifter);

}

function range_end_html(minute)
{
        var mxt = $('.zminute_DIV[minute=' + minute + ']');
        mxt.find('.zm_marker').append('<div class="range_label" state="za_end"><button class="shifter">Up</button><button class="shifter">Down</button><div>');
        mxt.find('.shifter').on('click',shifter);
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
		range_start_html(minute,value);
	} else if (mxt.hasClass('za_end'))  {
		range_end_html(minute);
	}
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

function generate_select_bar()
{
	console.log("generated select bar");
	$("#select_bar").remove();
	$("#ranges").prepend('<div id="select_bar"></div>');
     	$("#select_bar").append('<div class="output_hour">Jump</div>');
        $(".zminute_DIV").each(function(){
                var minute = $(this).attr('minute');
		var match_classes = ' ' + $(this)[0].className.replace('zminute_DIV','');
                $("#select_bar").append('<div class="sb_DIV' + match_classes  + '" id="sb_' + minute + '" minute="' + minute + '" style="--minute:' + minute +  '"><a class="MIN_jumper">' + minute + '</a></div>');
        });
        $(".MIN_jumper").on('click',function(e){
                e.preventDefault();
                $([document.documentElement, document.body]).animate({
                        scrollTop: $('.zminute_DIV[minute="' +  $(this).text()  + '"]').offset().top
                }, 100);
        });
        $(".za_minute").addClass('za_nothing');
        $(".za_DIV").off('click').on('click',
        function(){
                var minute = $(this).parent().attr('minute');
                toggle_state(minute);
        });
}

$(document).ready(function() {
	miru_tool.init();
    $(".zminute_DIV").each(function(){
                var minute = $(this).attr('minute');
                $(this).find('.zm_marker:first').append('<div class="other_cams" minute="' + minute  + '"></div>');
       });

	$(".clearer").off('click').on('click',function(e) { miru_tool.clear_all() });
	$(".next_cam").off('click').on('click',function(e) { 
		miru_tool.next_feed(e);
		
	} );
	$('.prev_cam').off('click').on('click',function(e) { miru_tool.prev_feed(e);  });
	$('.generator').off('click').on('click',function(e) { 
	generate_ranges()
	} );

	$('.cam7').html('Send').off('click').on('click',function(e) {
		

fetch('/cgi-bin/za-horu.cgi?d=' + miru_tool.date  + '&h=' + miru_tool.hour  +  '&i="' + encodeURIComponent($("#real_string").html()) + '"' )
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

//		exec_copy( "sudo nohup zsh za-toru.sh scp=9 cam=7 m=y d=" + miru_tool.date + " s=" + miru_tool.hour + " e=" + miru_tool.hour) ;
	});
	$('.copyit').off('click').on('click',function(e) {
	try {
	        exec_copy($("#run_string").text().replace(/(?:\r\n|\r|\n)/g,''),miru_tool.copied());
  	} catch (err) {
    	  console.error('Fallback: Oops, unable to copy', err);
  	}
	});
	$(".dim_input").on('change',function() {
		document.documentElement.style.setProperty('--ss_top',$('#top').val() );
		document.documentElement.style.setProperty('--ss_left',$('#left').val() );
		document.documentElement.style.setProperty('--ss_right',$('#right').val() );
		document.documentElement.style.setProperty('--ss_bottom',$('#bottom').val());
		console.log('dimensions: top:' + $('#top').val() + ' l:' + $('#left').val() + ' r:'  + $('#right').val() + ' b:' +  $('#bottom').val() );
	});

	miru_tool.show();

	$(document).find(".za_img:first").one('load',function(e){
		var row_height = Math.floor($(".za_img[minute=00][screen=001]").height() + 1);
		if (Number.isNaN(row_height)) { row_height = 200; }
		console.log('row height:' + row_height);
		document.documentElement.style.setProperty('--minute_height',row_height + "px" );
	}).each(function(){
	if(this.complete) {
		$(this).trigger('load');
	}
	}
	);
	$('.za_DIV').each(function(){
	   $(this).append('<div class="za_png" >PNG</div>');
	});
	$('.za_png').off('click').on('click',function (e){
           e.preventDefault();
           e.stopPropagation();
		miru_tool.png($(this).closest('.zminute_DIV').attr('minute'),parseInt(($(this).parent().attr('screen') -1) * 20));
	});
});


var img_compare = 
{

load(minute)
{
   var c = [];
   var scale = 0.2;
   var iwidth = 1920 * scale;
   var iheight = 1080 * scale;
   for (var i =1; i <= 3; i++) 
   {   
	$('body').append( '<canvas width="' + iwidth +  '" height="' + iheight +'"  id="c' + i +  '"></canvas>');
  	c[i] = $('#c' + i)[0].getContext('2d');
   }
   
   c.forEach((item,index) => {
console.log('.za_img[minute=' + ("00" + minute).slice(-2) +  '][screen=' + ("000" + index).slice(-3) + ']');
	   item.drawImage($('.za_img[minute=' +  ("00" + minute).slice(-2)  +  '][screen=' + ("000" + index).slice(-3) + ']')[0],0,0,iwidth,iheight);
	   img_compare.eightbit(item); 
  });
  img_compare.compare(c[1].getImageData(0,0,iwidth,iheight).data,c[2].getImageData(0,0,iwidth,iheight).data);


},
compare(a,b)
{
	var diff = 0;
	for(var i = 0, il = a.length; i < il; i++) {
  		 if  (a[i] != b[i]) { diff++; }  
	}
	console.log(diff + ' of ' + a.length);
},


  eightbit(ctx) {
var imgdata = ctx.getImageData(0, 0, 400, 400); // get data
var data = imgdata.data; // bytes

// 8-bit: rrr ggg bbb
for(var i = 0; i < data.length; i += 4) {
    data[i]     = img_compare.nearest(data[i],     8); // set value to nearest of 8 possibilities
    data[i + 1] = img_compare.nearest(data[i + 1], 8);
    data[i + 2] = img_compare.nearest(data[i + 2], 4);
}

ctx.putImageData(imgdata, 0, 0); // put image data to canvas
},

nearest(x, a) { // will round down to nearest of a possibilities
                         // in the range 0 <= x <= 255
    return Math.floor(x / (255 / a)) * (255 / a);
}


}
