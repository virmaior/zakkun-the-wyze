var za_classes = ['za_start','za_end','za_nothing'];
var za_size = za_classes.length;

function clear_ranges()
{
  localStorage.setItem("zaday",JSON.stringify({}));
  $('#ranges').html('<div id="select_bar"></div>');
  generate_select_bar();
  $('#run_string').html('');
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


function make_range(ranges,start,finish, range_label,cam)
{
	my_range = {"s": start , "e" : finish};
        if  (range_label) { 
                if (range_label != "undefined") {
			my_range["label"] = range_label;
                }
        }
	if (cam) {
		if (cam != "undefined") {
			my_range["cam"] = cam;
		}
	}
   ranges.push(my_range);
}


function zsh_decode_item(my_range)
{
        var item_text = "s:" + my_range["s"] + ";e:" + my_range["e"];
	if (my_range["label"]) { item_text += ';l:' + my_range["label"]; }
        if (my_range["cam"]) { item_text += ';c:' + my_range["cam"]; }
        return item_text;
}


function zsh_decode(my_ranges)
{
       var  zsh_output = [];
        my_ranges.forEach(
	function(item,index){
                zsh_output.push( zsh_decode_item(item));
        });
        return zsh_output.join(',');

}

function html_decode(my_ranges) 
{
	var  html_output = "";
	my_ranges.forEach(function(item,i){
		html_output  += html_decode_item(item);
	});
	return html_output;
}


function html_decode_item(my_range)
{
	console.log(my_range);
	var my_cam = 1;
	if (my_range["cam"] ) {  my_cam = my_range["cam"];  }
	var item_text =  '<div class="range_start">' + my_range["s"] + '</div><div class="range_end">' + my_range["e"] + '</div>'; 
	if (my_range["label"]) { 
		var item_label = my_range["label"];
		item_label = item_label.replace(/_/g," ");
		item_text += '<div class="range_label">' + item_label + '</div>'; 
	}
	range_width = my_range["e"] - my_range["s"] + 1;
	return '<div class="html_range cam_' + my_cam + '" start="' + my_range["s"]  + '" style="--start:' + my_range["s"] + ';--rangewidth:' + range_width  +  '">' +  item_text + '</div>';
	
}

function cross_reference(my_ranges,my_cam)
{
	console.log("entered cross reference");
      	my_ranges.forEach(
        function(item,index){
                var start = item.s;
		var item_label_pretty = item.label.replace(/_/g," ");
		$('.other_cams[minute="' + item.s +  '"]').append('<div class="cam_' + item.cam + ' za_start_weak">' + item_label_pretty + '</div>');
		var i = (item.s *1);
		var last_mid = (item.e * 1) -1;
		while (i  < last_mid) {
			i++;
			var i_pretty = String(i).padStart(2, '0')
			$('.other_cams[minute="' + i_pretty +  '"]').append('<div class="cam_' + item.cam + ' za_continue_weak">' + item_label_pretty + '</div>');	
		}
		var i_pretty =  String(item.e * 1).padStart(2, '0')
               $('.other_cams[minute="' + i_pretty +  '"]').append('<div class="cam_' + item.cam + ' za_end_weak">' + item_label_pretty + '</div>');  
        });
	
}


function  decode_hour_label(hour_label)
{
        var pieces =  hour_label.split(';');
	var hour =  pieces[0].replace('h:','');
	var cam_id = pieces[1].replace('c:','');

	return '<div class="output_hour cam_' + cam_id + '">' + hour + '<Br /> ' + cam_id  + '</div>'; 
}


function show_ranges()
{
	var zaday = localStorage.getItem("zaday");
	if (!zaday) {
		var  all_ranges  = [];
	} else {
	var all_ranges =  JSON.parse(zaday);
	}
	console.log(all_ranges);
	var my_string = "";
  	var cam = $(".za_top_DIV").attr('cam');
	var this_hour = "h:" + $(".za_top_DIV").attr('hour');
	var html_output = "";

        $('.other_cams').empty();

	for(var hour in all_ranges)
	{
		my_string +=  hour + '>' +   zsh_decode(all_ranges[hour]) + "V\n";
		html_output += '<div class="output_row">' + decode_hour_label(hour)  +  html_decode(all_ranges[hour]) + '</div>';

		if (hour.split(';')[0] == this_hour) {
			cross_reference(all_ranges[hour],cam);
		}
		console.log(my_string);
	}

        var day = $(".za_top_DIV").attr('day');	
	$('#ranges').html( html_output);
	generate_select_bar();
	$('#run_string').html('sudo zsh za-horu.sh d=' + day  + '  i="' + my_string + '"');
	
}

function update_ranges(hour,cam,clean_ranges)
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
	var all_ranges =  JSON.parse(zaday);
	} else { all_ranges = {} }
	all_ranges["h:" + hour + ";c:" +  cam ] = clean_ranges;
	localStorage.setItem('zaday',JSON.stringify(all_ranges));

}

function get_range_name(minute)
{
	if ($('.range_label INPUT[minute="' + minute +  '"]')) {
		var rrange  = $('.range_label INPUT[minute="' + minute +  '"]').val();
		console.log("success on " + rrange);
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

        var cam = $(".za_top_DIV").attr('cam');
	$('.zminute_DIV').each(function(){
	    var minute = $(this).attr('minute');
		if ($(this).hasClass('za_single')) {
			if (!first_minute) {
			   var range_name = get_range_name(minute);
			   make_range(ranges,minute,minute,range_name,cam);
			}

		}
		if ($(this).hasClass('za_start')) {
			first_minute = minute;
		}
		if ($(this).hasClass('za_end')) {
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

	console.log("tidying ranges");	
	var hour = $(".za_top_DIV").attr('hour');
	var clean_ranges = [];
	var last_start = false;
	var last_end = false;
	var last_name_range =false;
	ranges.forEach(
	function (item,index) {
		console.log(item);
		var current_start = item.s;
		var current_end = item.e;
	        var range_name  = item.label;
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
	update_ranges(hour,cam,clean_ranges);
	show_ranges();
}


function find_before(minute)
{
	var search_min =  minute -1;
	while (search_min >= 0 ) {
    		var s = search_min.toString().padStart(2,"0");
		var test = $(".zminute_DIV[minute=" + s + "]");
		if (test.hasClass('za_start')) { return 'za_start'; }
		if (test.hasClass('za_end')) { return 'za_end'; }
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
	var source = $(this).parent().find('INPUT').attr('minute') * 1;
               switch (shifter)
               {
                             case "Up":var dest = source - 1; break;
                             case "Down":var dest = source +1; break;
               }
                      
	dest = dest.toString().padStart(2,"0");
	source = source.toString().padStart(2,"0");

	console.log('start with ' + source + ' dest  ' + dest);
	var srow = $('.zminute_DIV[minute=' +  source + ']');
	var drow = $('.zminute_DIV[minute=' + dest + ']');
	srow.find('.range_label INPUT').attr('minute',dest);
	srow.find('.range_label').appendTo(drow.find('.zm_marker'));
	drow.attr('class',srow.attr('class'));
	srow.remove('.range_label');
	srow.removeClass('za_start'); 

	force_set( $('.sb_DIV[minute=' + source + ']'),'za_nothing');
	force_set( $('.sb_DIV[minute=' + dest + ']'),'za_start');
}


function toggle_state(minute)
{
		console.log("called toggle 3 on " + minute);
		var mxt = $('.zminute_DIV[minute=' + minute + ']');
		toggle_set( $('.sb_DIV[minute=' + minute + ']'));
		toggle_set(mxt);
		if (mxt.hasClass('za_start')) {
			mxt.find('.zm_marker').append('<div class="range_label"><input class="rl_name"  minute="' + minute + '" value="" /><button class="shifter">Up</button><button class="shifter">Down</button>');
			mxt.find('.shifter').on('click',shifter);
		} else {
			mxt.find('.zm_marker .range_label').remove();		
		}
		
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
	$(".za_top_DIV").addClass("cam_" + $(".za_top_DIV").attr('cam'));	

    $(".zminute_DIV").each(function(){
                var minute = $(this).attr('minute');
                $(this).find('.zm_marker:first').append('<div class="other_cams" minute="' + minute  + '"></div>');
       });


	//generate_select_bar();
	$(".dim_input").on('change',function() {

		document.documentElement.style.setProperty('--ss_top',$('#top').val() );
		document.documentElement.style.setProperty('--ss_left',$('#left').val() );
		document.documentElement.style.setProperty('--ss_right',$('#right').val() );
		document.documentElement.style.setProperty('--ss_bottom',$('#bottom').val());
	
		console.log('dimensions: top:' + $('#top').val() + ' l:' + $('#left').val() + ' r:'  + $('#right').val() + ' b:' +  $('#bottom').val() );
	});


			
	show_ranges();

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
});

