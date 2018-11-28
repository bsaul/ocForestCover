function intersection(a, b){
  var t;
  if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
  return a.filter(function (e) {
      return b.indexOf(e) > -1;
  });
}

function setdiff(a, b){
  var t;
  if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
  return a.filter(function (e) {
      return b.indexOf(e) == -1;
  });
}

//Taken from : https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Collapse Toggle modified from: https://medium.com/dailyjs/mimicking-bootstraps-collapse-with-vanilla-javascript-b3bb389040e7
const fnmap = {
	'toggle': 'toggle',
	'show': 'add',
	'hide': 'remove'
};

const collapse = (selector, cmd) => {
	const targets = Array.from(document.querySelectorAll(selector));
	const hidetargets = Array.from(document.querySelectorAll('.collapse.show'));
	targets.forEach(target => {
		target.classList[fnmap[cmd]]('show');
		hidetargets.forEach(hidetargets => {
			if (target != hidetargets) {
				hidetargets.classList.remove('show');
			}
		});
	});
}

// Grab all the trigger elements on the page
const triggers = Array.from(document.querySelectorAll('[data-toggle="collapse"]'));

// Listen for click events, but only on our triggers
window.addEventListener('click', (ev) => {
  const elm = ev.target;
  if (triggers.includes(elm)) {
    const selector = elm.getAttribute('data-target');
    collapse(selector, 'toggle');
  }
}, false);