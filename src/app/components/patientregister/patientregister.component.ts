import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DOCUMENT } from '@angular/platform-browser';
import { Package } from 'src/app/models/Package';
import { PatientQuestion } from 'src/app/models/PatientQuestion';
import PatientQuestionAnswer from 'src/app/models/PatientQuestionAnswer';
import { Psychologist } from 'src/app/models/Psychologist';
import { AuthService } from 'src/app/services/auth.service';
import { PackageService } from 'src/app/services/package.service';
import { PatientService } from 'src/app/services/patient.service';
import { PaymentService } from 'src/app/services/payment.service';
import { PsychoService } from 'src/app/services/psycho.service';
import { VoucherService } from 'src/app/services/voucher.service';
import { environment } from 'src/environments/environment';
import { Patient } from '../../models/Patient';


@Component({
	templateUrl: 'patientregister.component.html',
	styleUrls: ['patientregister.component.css']
})

export class PatientRegisterComponent implements OnInit {
	patientQuestionForm: FormGroup = new FormGroup({});
	patientPersonalForm: FormGroup;
	availablePsychologistsForm: FormGroup;
	packagesForm: FormGroup;
	paymentForm: FormGroup = new FormGroup({});
	loading = false;
	submitted = false;
	page: number = 1;
	finalSubmitError: boolean = false;
	duplicateUsername: boolean;
	successEmailAddress: string;
	patientQuestions: PatientQuestion[];
	patientAnswers: PatientQuestionAnswer[] = [];
	availablePsychologists: Psychologist[];
	activePackages: Package[];
	environment = environment;
	selectedPackage: Package = new Package();
	chosenPsychName: string;
	showVouchercode: boolean = false;
	showPaymentPage: boolean = false;
	showVoucherSuccess: boolean;
	voucherSuccess: boolean;
	voucherSuccessResultText: string;
	invalidVoucherCode: boolean;
	chosenPsychNameEncoded: string;
	isTermsAndConditionsAccepted: boolean=false;

	constructor(
		private formBuilder: FormBuilder,
		private patientService: PatientService,
		private psychService: PsychoService,
		private packageService: PackageService,
		private _renderer2: Renderer2,
		@Inject(DOCUMENT) private _document,
		private authService: AuthService,
		private paymentService: PaymentService,
		private voucherService: VoucherService
	) { }

	/* convenience getter for easy access to form fields */
	/* --------------------------------------------------------------------- */
	get _patientPersonalForm() { return this.patientPersonalForm.controls; }
	get _patientQuestionForm() { return this.patientQuestionForm.controls; }
	get _availPsychForm() { return this.availablePsychologistsForm.controls; }
	get _packageForm() { return this.packagesForm.controls; }
	/* --------------------------------------------------------------------- */

	ngOnInit() {

		this.patientPersonalForm = this.formBuilder.group({
			patientAlias: ['', Validators.required],
			patientEmail: ['', [Validators.required, Validators.email]],
			patientPassword: ['', Validators.required],
			patientConfirmPassword: ['', Validators.required]
		},
			{ validator: this.validatePassword });

		this.initQuestionForm();

		this.availablePsychologistsForm = this.formBuilder.group({
			psychologistChoice: ['', Validators.required]
		});

		this.initChoosePsychForm();

		this.packagesForm = this.formBuilder.group({
			packageChoice: ['', Validators.required],
			voucherCode: ['']
		});

		this.initChoosePackageForm();
	}

	initPaymentForm(checkoutId: string): void {
		let s = this._renderer2.createElement('script');
		s.src = environment.checkoutFormSrc + '?checkoutId=' + checkoutId;
		this._renderer2.appendChild(this._document.body, s);

		let payFormOptions = this._renderer2.createElement('script');
		payFormOptions.text = `
            var wpwlOptions = {
                onReady: function() {
                    x=document.getElementsByClassName("wpwl-button-pay");  // Find the elements
                    for(var i = 0; i < x.length; i++){
                    x[i].innerText="Save card";    // Change the content
                    }
                }
            }
        `;
		this._renderer2.appendChild(this._document.body, payFormOptions);
	}

	initChoosePackageForm(): void {
		this.packageService.getActivePackages().subscribe(result => {
			this.activePackages = result;
		},
			error => {
				console.error('Could not get active packages: ' + JSON.stringify(error.error));
			});
	}

	initChoosePsychForm(): void {
		this.psychService.getAvailable(4).subscribe(result => {
			this.availablePsychologists = result;
		},
			error => {
				console.error('Could not get available psychologists: ' + JSON.stringify(error.error));
			});
	}

	initQuestionForm(): void {
		this.patientService.getQuestions().subscribe(result => {
			//We need to specifically instatiate PatientQuestion so its getters work
		
			var questions = result.map(x => new PatientQuestion(x));

			let group: any = {};
			questions.forEach(question => {
				if (question.type == 1) {
					const arr = question.multipleChoiceOptionsArr.map(() => {
						return new FormControl(false);
					});
					group[question.key] = this.formBuilder.array(arr);
				}
				else
					group[question.key] = new FormControl('');
			});
			this.patientQuestionForm = new FormGroup(group);
			this.patientQuestions = questions;
		},
			error => {
				console.error('Could not get patient questions: ' + JSON.stringify(error.error));
			});
	}

	goBack() {
		this.page += -1;
		//Clear any final submit errors that could have occured on a previous final submit
		this.finalSubmitError = false;
		this.duplicateUsername = false;
		this.invalidVoucherCode = false;
	}

	nextPage() {
		this.page += 1;
		window.scroll(0, 0);
	}

	/* Submit Forms */

	onPatientPersonalSubmit() {
		this.submitted = true;
		if (this.patientPersonalForm.valid) {
			this.submitted = false;
			this.nextPage();
		}
	}

	onPatientQuestionsSubmit() {
		this.submitted = true;
		if (this.patientQuestionForm.valid) {
			this.processPatientQuestionForm();
			this.submitted = false;
			this.nextPage();
		}
	}

	onAvailablePsychologistsSubmit() {
		this.submitted = true;
		if (this.availablePsychologistsForm.valid) {
			this.submitted = false;
			this.nextPage();
		}
	}

	onPackageSubmit() {
		if (this._packageForm.voucherCode.value) {
			this.submitted = false;
			this.finalSubmit();
		} else {
			this.submitted = true;
			if (this.packagesForm.valid) {
				this.selectedPackage = this.activePackages.filter(x => x.id == this._packageForm.packageChoice.value)[0];
				this.submitted = false;
				this.finalSubmit();
			}
		}

	}

	async finalSubmit() {
		try {
			this.loading = true;
			//Create user and get returned token
			var token = await this.createPatientUser();
			//Set token
			this.authService.setAccessToken(token);
			//get chosen psych name for use in the add card result page
			var chosenPsych = this.availablePsychologists.filter(x => x.id == this._availPsychForm.psychologistChoice.value)[0];
			this.chosenPsychName = chosenPsych.firstName + " " + chosenPsych.lastName;
			this.chosenPsychNameEncoded = encodeURI(this.chosenPsychName);

			if (this._packageForm.voucherCode.value) {
				//show success
				this.doVoucherSuccess();
			}
			else {
				await this.doPayment();
			}

			this.loading = false;
		} catch (error) {
			//Error!
			this.loading = false;

			//Check for duplictate username error
			if (error.error.DuplicateUserName) {
				this.duplicateUsername = true;
			} else if (error.error.InvalidVoucherCode) {
				this.invalidVoucherCode = true;
				
			} else {
				this.finalSubmitError = false;
			}
			console.log(JSON.stringify(error));
		}
	}

	private doVoucherSuccess() {
		this.patientService.getCurrentPatientPackage().subscribe(resp => {
			this.voucherSuccessResultText = `You are now signed up and ready to go!
			<br /><br />Your voucher gives you the following:<br/><br/>`;
			
			if(resp.packageVoucher.freePeriods > 0)
			{
				this.voucherSuccessResultText += `<div><b>${resp.packageName}</b> - free for the first <b>${resp.packageVoucher.freePeriods}</b> billing cycle(s).</div>`;
			}

			if(resp.packageVoucher.discountPeriods > 0 && resp.packageVoucher.discountPercent > 0)
			{
				this.voucherSuccessResultText += `<div><b>${resp.packageVoucher.discountPercent}%</b> off for the next <b>${resp.packageVoucher.discountPeriods}</b> billing cycle(s).</div>`;
			}

			this.voucherSuccessResultText += `<br /><br />Your psychologist <b>${this.chosenPsychName}</b> can't wait to meet you. Click the button below to start your first session.`;

			this.voucherSuccess = true;
			this.setPage(6);
		}, error => {
			console.error(JSON.stringify(error));
		});
	}

	private setPage(page: number): void {
		this.page = page;
		window.scroll(0, 0);
	}

	private async doPayment() {
		var payAmount = this.activePackages.filter(x => x.id == this._packageForm.packageChoice.value)[0].cost;
		var checkout = await this.getCheckoutId(payAmount);
		//Dynamically build our payment form
		this.initPaymentForm(checkout.checkoutId);
		//Set page
		this.nextPage();
	}

	async getCheckoutId(amount: number): Promise<any> {
		return await this.paymentService.createCheckout();
	}

	async createPatientUser(): Promise<string> {
		var patientUser = new Patient();
		patientUser.email = this._patientPersonalForm.patientEmail.value;
		patientUser.alias = this._patientPersonalForm.patientAlias.value;
		patientUser.password = this._patientPersonalForm.patientPassword.value;
		patientUser.questionAnswers = this.patientAnswers;
		patientUser.currentPsychologistId = this._availPsychForm.psychologistChoice.value;
		patientUser.voucherCode = this._packageForm.voucherCode.value;

		if (!patientUser.voucherCode)
			patientUser.currentPackageId = this._packageForm.packageChoice.value;

		var result = await this.patientService.register(patientUser)
		return result.token;
	}

	private processPatientQuestionForm() {
		this.patientAnswers = [];
		this.patientQuestions.forEach(question => {
			var answer = '';
			var questionControl = this.patientQuestionForm.controls[question.key];
			if (question.type == 1) {
				var answerArr = [];
				(<FormArray>questionControl).controls.forEach((answer, index) => {
					if (answer.value === true) {
						answerArr.push(question.multipleChoiceOptionsArr[index]);
					}
				});
				answer = answerArr.join(';');
			}
			else {
				if (questionControl.value != '')
					answer = questionControl.value;
			}
			if (answer != '')
				this.patientAnswers.push({ questionId: question.id, answer: answer, question: null, questionTypeId: null });
		});
	}

	/* Password validation */
	/* --------------------------------------------------------------------- */
	validatePassword(group: FormGroup) {
		let pass = group.controls.patientPassword.value;
		let confirmPass = group.controls.patientConfirmPassword.value;

		if (pass === confirmPass)
			return null;
		else
			group.controls.patientConfirmPassword.setErrors({ dontMatch: true });
	}
	/* --------------------------------------------------------------------- */

	clearVoucherCode() {
		this._packageForm.voucherCode.setValue('');
		this.showVouchercode = false;
	}

	checkValue(event: any){
		if(event==false)
		{
			this.isTermsAndConditionsAccepted=true;
		}
		else
		{
			this.isTermsAndConditionsAccepted=false;
		}
	 }
}