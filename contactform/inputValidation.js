jQuery(document).ready(function($) {
  "use strict";

  // Contact
  $('form.contactForm').submit(function(event) {
    event.preventDefault(); // Prevent the default form submission

    var url = $(this).attr('action');
    var selectedSubjects = [];

    // Get selected subjects if form action matches
    if (url === "contactform/workwithusform.php") {
      selectedSubjects = getSelectedSubjects();
      if (selectedSubjects.length === 0) {
        alert("Devi selezionare almeno una materia da insegnare.");
        return false;
      }
      console.log("Materie selezionate:", selectedSubjects);
    }
    
    var f = $(this).find('.form-group'),
    ferror = false,
    emailExp = /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i;

    // Validate inputs
    f.children('input').each(function() { // Run all inputs
      var i = $(this); // Current input
      var rule = i.attr('data-rule');
      if (rule !== undefined) {
        var ierror = false; // Error flag for current input
        var pos = rule.indexOf(':', 0);
        if (pos >= 0) {
          var exp = rule.substr(pos + 1, rule.length);
          rule = rule.substr(0, pos);
        } else {
          rule = rule;
        }

        switch (rule) {
          case 'required':
            if (i.val() === '') {
              ferror = ierror = true;
            }
            break;
          case 'minlen':
            if (i.val().length < parseInt(exp)) {
              ferror = ierror = true;
            }
            break;
          case 'email':
            if (!emailExp.test(i.val())) {
              ferror = ierror = true;
            }
            break;
          case 'len':
            if (i.val().length != parseInt(exp)) {
              ferror = ierror = true;
            }
            break;
          case 'checked':
            if (! i.is(':checked')) {
              ferror = ierror = true;
            }
            break;
          case 'regexp':
            exp = new RegExp(exp);
            if (!exp.test(i.val())) {
              ferror = ierror = true;
            }
            break;
        }
        i.next('.validation').html((ierror ? (i.attr('data-msg') !== undefined ? i.attr('data-msg') : 'wrong Input') : '')).show('blind');
      }
    });

    f.children('textarea').each(function() { // Run all textareas
      var i = $(this); // Current textarea
      var rule = i.attr('data-rule');
      if (rule !== undefined) {
        var ierror = false; // Error flag for current textarea
        var pos = rule.indexOf(':', 0);
        if (pos >= 0) {
          var exp = rule.substr(pos + 1, rule.length);
          rule = rule.substr(0, pos);
        } else {
          rule = rule;
        }

        switch (rule) {
          case 'required':
            if (i.val() === '') {
              ferror = ierror = true;
            }
            break;
          case 'minlen':
            if (i.val().length < parseInt(exp)) {
              ferror = ierror = true;
            }
            break;
        }
        i.next('.validation').html((ierror ? (i.attr('data-msg') != undefined ? i.attr('data-msg') : 'wrong Input') : '')).show('blind');
      }
    });

    if (ferror) return false;

    // Serialize form data
    var formData = $(this).serialize();
    // Append selected subjects
    if (selectedSubjects.length > 0) {
      formData += '&subjects=' + encodeURIComponent(JSON.stringify(selectedSubjects));
    }

    console.log(formData);
    $.ajax({
      type: "POST",
      url: url,
      data: formData,
      success: function(msg) {
        alert(msg);
        if (msg === 'OK') {
          $("#sendmessage").addClass("show");
          $("#errormessage").removeClass("show");
          $('.contactForm').find("input, textarea").val("");
        } else {
          $("#sendmessage").removeClass("show");
          $("#errormessage").addClass("show");
          $('#errormessage').html(msg);
        }
      }
    });
    return false;
  });

});

function getSelectedSubjects() {
  var selectedSubjects = [];
  $('input[name="subjects[]"]:checked').each(function() {
    selectedSubjects.push($(this).val());
  });
  return selectedSubjects;
}