import { FormControl } from '@angular/forms';
import moment from 'moment';
 
export class DateOfBirthValidator {
 
    static isValid(control: FormControl): any {
        var userAge = moment().diff(control.value, 'years');

        if(isNaN(userAge)){
            return {
                "Invalid age": true
            };
        }
 
        if(userAge < 18){
            return {
                "Under 18": true
            };
        }
 
        if (userAge > 120){
            return {
                "Not realistic": true
            };
        }
 
        return null;
    }
 
}