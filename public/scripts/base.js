jQuery.fn.editableList = function(options){
    return this.each(function(){
        
        var self = $(this)
          , addButton = self.find('.add')
          , list = self.find('ul')
          
        addButton.click(function(e){
            var uid = ++jQuery.uuid
              , li = $('<li/>')
              , button = $('<button/>').text('save')
              , input = $('<input />')
              
            li.addClass('newItem')
                .append(input)
                .append(button)
                .appendTo(list)
                
            button.click(function(){
                var val = input.val()
                options.save(options.type, val)
                input.add(button).remove()
                li.removeClass('newItem')
                li.text(val)
                li.data('value', val)
                // update select elements
                $('#'+options.type).append('<option value="'+val+'">'+val+'</option>')
            })
            
            input.focus()
        })
        
        self.delegate('.delete', 'click', function(e){
            
            var li = $(this).parent()
              , value = li.data('value')
              
            options.remove(options.type, value)
            li.fadeOut(300, function(){
                $(this).remove()
            })
            
            $('#'+options.type).find('option[value='+value+']').remove()
            
        })
                
    })
}

var socket = io.connect('http://localhost:3000')

socket.on('connect', function(){
    
    // home page
    if ($(document.body).is('.watching')){
        socket.emit('isWorking', null, function (working) {
            if(working){
                $('#working').show()
            } else {
                $('#notworking').show()
            }
        })
        socket.on('newGuess', function(data){
            var output = "Suspect: " + data.suspect
            output += ", Place: " + data.place
            output += ", Weapon: " + data.weapon
            output += " " + (data.response === 0 ? "(Correct)" : "(Wrong)")
            $('#working').text(output)
        })
    }

    // detective page
    if ($(document.body).is('.detective')){
        
        // navigation
        var content = $('.content')
          , links = $('#nav a')
        
        links.click(function(e){
            e.preventDefault()
            
            var targetId = $(this).attr('href')
            
            links.removeClass('active')
            $(this).addClass('active')
            
            content.hide()
            $(targetId).show()
        })
        
        socket.emit('workingStatus', true)
        socket.on('disconnect', function(){
            socket.emit('workingStatus', false)
        })
        
        function saveItem(type, name){
            socket.emit('saveItem', {
                type: type
              , name: name
            })
        }
        
        function deleteItem(type, name){
            socket.emit('deleteItem', {
                type: type
              , name: name
            })
        }
        
        $('#suspects')
            .editableList({ save: saveItem, remove: deleteItem, type: 'suspect' })
        $('#places')
            .editableList({ save: saveItem, remove: deleteItem, type: 'place' })
        $('#weapons')
            .editableList({ save: saveItem, remove: deleteItem, type: 'weapon' })
            
        result = $('#result');
            
        $('#sendGuess').click(function(e){
            var suspect = $('#suspect').val()
              , place = $('#place').val()
              , weapon = $('#weapon').val()
              
            socket.emit('guess', {
                suspect: suspect
              , place: place
              , weapon: weapon
            }, function(res){
                result.text(res === 0 ? "Resposta correta" : "Resposta errada ("+res+")")
            })
        })
    }
    
})