all : doc
	-rm Rete.min.js
	r.js -o minifyData.js

doc :
	-rm -r docs
	jsdoc ./js -r -d ./docs
