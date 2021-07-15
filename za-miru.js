var za_classes = ['za_single','za_start','za_end','za_nothing'];

function clear_ranges()
{
  localStorage.setItem("zaday",JSON.stringify({}));
  $('#ranges').html('<PRE></PRE>');
  $('#run_string').html('');
}


function make_range(ranges,start,finish, range_label)
{
	var rname = "";
   	if  (range_label) { 
		if (range_label != "undefined") {
		rname = ";l:" + range_label; 
		}
	}
   ranges.push("s:" + start + ";e:" + finish + rname);
}



function show_ranges()
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
		var all_ranges =  JSON.parse(zaday);
		console.log(all_ranges);
		var my_string = "";
		
for(var hour in all_ranges)
{
	my_string +=  hour + '>' +   all_ranges[hour].join(",") + "\n";
}

		$('#ranges').html('<PRE>' + my_string +  '</PRE>');
		$('#run_string').html('zsh za-horu.sh i="' + my_string.replace("\n","VVV") + '"');
	}
}

function update_ranges(hour,clean_ranges)
{
	var zaday = localStorage.getItem("zaday");
	if (zaday) {
	var all_ranges =  JSON.parse(zaday);
	} else { all_ranges = {} }
	all_ranges[hour] = clean_ranges;
	localStorage.setItem('zaday',JSON.stringify(all_ranges));

}

function get_range_name(minute)
{
		if ($('.range_label[minute="' + minute +  '"]').length) {
			//console.log("had range label " +  $('.range_label[minute="' + minute +  '"]').val()) ;
			var rrange  = $('.range_label[minute="' + minute +  '"]').val();	
			if (rrange != "") { 
						        return rrange.replace(/ /g,"_"); 
			}
		}	
		return false;	
}

function generate_ranges()
{
	console.log("started range generator");
	var ranges = [];
	var first_minute = false;
	var tight_interval = 1;
	var range_name = false;
	$('.sb_DIV').each(function(){
	    var minute = $(this).attr('minute');
		if ($(this).hasClass('za_single')) {
			if (!first_minute) {
			     var range_name = get_range_name(minute);
				make_range(ranges,minute,minute,range_name);

			}

		}
		if ($(this).hasClass('za_start')) {
			first_minute = minute;
		}
		if ($(this).hasClass('za_end')) {
			var range_name = get_range_name(first_minute);
			make_range(ranges,first_minute,minute,range_name);
			first_minute = false;
			range_name = false;
		}

	});

	if (first_minute) { 
		
		console.log("determined final block is active");
        	var range_name = get_range_name(first_minute);
		make_range(ranges,first_minute,59,range_name);
	 }

	console.log("tidying ranges");	
	var hour = $(".za_top_DIV").attr('hour');
	var clean_ranges = [];
	var last_start = false;
	var last_end = false;
	var last_name_range =false;
	ranges.forEach(
	function (item,index) {
		obj ={};
	   	var parts = item.split(';');
		var i;
		for (i in parts) {
			parts[i] = parts[i].split(":");
			obj[parts[i][0]]=parts[i][1];
		}
		var current_start = obj.s;
		var current_end = obj.e;
	        var range_name  = obj.l;
		if (!last_start) { last_start = current_start; last_end =  current_end; last_range_name = range_name; }
		else { 
		   if (current_start == (last_end + 1)) {
			last_end = current_end;
		   } else {
			make_range(clean_ranges,last_start,last_end,last_range_name);
			last_start = current_start; last_end =  current_end; last_range_name = range_name;
		   }
		}}
	);

	if (last_start) {
		make_range(clean_ranges,last_start,last_end,last_range_name);
	}
	update_ranges(hour,clean_ranges);
	show_ranges();
}

function toggle_set(el)
{
	var current_za_class = -1;
	za_classes.forEach(
	function(item,index)
	{
	   if ($(el).hasClass(item)) { current_za_class = index; 
	  	$(el).toggleClass(item)
	   }			
	}
	); 	
	

	$(el).toggleClass(za_classes[(current_za_class+1)%za_classes.length]); 
}


function toggle3(minute)
{
	
		console.log("called toggle 3 on " + minute);
		var mt = $("#sb_" + minute);
		var mxt = $('.zminute_DIV[minute=' + minute + ']');
		toggle_set(mxt);
		mxt.find('.zm_marker .range_label').remove();
		if (mxt.hasClass('za_start')) {
	
			mxt.find('.zm_marker').append('<input minute="' + minute + '" class="range_label" value="" /> ');
		}	
		toggle_set(mt);
}

$(document).ready(function() {
	$(".zminute_DIV").each(function(){
		var minute = $(this).attr('minute');

		$("#select_bar").append('<div class="sb_DIV" id="sb_' + minute + '" minute="' + minute + '">' + minute + '</div>');
	});
	$(".sb_DIV").addClass('za_nothing');
	$(".za_minute").addClass('za_nothing');
	$(".za_DIV").on('click',
	function(){
		var minute = $(this).parent().attr('minute');
		toggle3(minute);
	});
	$(".sb_DIV").on('click',
	function() {
		var minute = $(this).attr('minute');
		toggle3(minute);

	}
	);
	$(".dim_input").on('change',function() {

		document.documentElement.style.setProperty('--ss_top',$('#top').val() );
		document.documentElement.style.setProperty('--ss_left',$('#left').val() );
		document.documentElement.style.setProperty('--ss_right',$('#right').val() );
		document.documentElement.style.setProperty('--ss_bottom',$('#bottom').val());
	
		console.log('dimensions: top:' + $('#top').val() + ' l:' + $('#left').val() + ' r:'  + $('#right').val() + ' b:' +  $('#bottom').val() );
	});


		
	show_ranges();
	document.documentElement.style.setProperty('--minute_height',Math.floor($(".za_img[minute=00][screen=001]").height() + 1) + "px" );

});

