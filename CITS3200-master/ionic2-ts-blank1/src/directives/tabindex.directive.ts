import { Directive, HostListener, Input } from '@angular/core';
import { TextInput } from 'ionic-angular';

@Directive({
	selector: '[myTabindex]'
})
export class TabindexDirective {

	constructor(private inputRef: TextInput) { }

	@HostListener('keydown', ['$event']) onInputChange(e) {
		var code = e.keyCode || e.which;

		if (code === 13) {
			e.preventDefault();
			this.inputRef.focusNext();
		}
	}
}