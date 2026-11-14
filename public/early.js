// Runs before the page draws. Marks that scripts are on, so things can start closed or hidden until they animate in.
// If the main script hasn't started within 3 seconds, this takes the mark off again, so nothing can stay invisible.
// It's a file rather than inline so the security policy can forbid inline scripts altogether.
document.documentElement.classList.add('js');
setTimeout(function () {
  if (!document.documentElement.classList.contains('motion-ready')) document.documentElement.classList.remove('js');
}, 3000);
