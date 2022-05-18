'use strict';

class Workout {
  date = new Date(); //?
  id = (Date.now() + '').slice(-10);

  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on  ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// let map, mapEvent;

// const run1 = new Running([39, -12], 5.3, 24, 178); //?
// const cycling1 = new Running([39, -12], 27, 95, 523); //?
// console.log(cycling1);

//////////////////////////////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const sortBy = document.querySelector('.sort-btn');
const clearAll = document.querySelector('.clear--all'); //?
const workoutCards = document.querySelector('.workout__cards'); //?

// const inputOptions = document.querySelector( '.form__input.form__input--options'); //?

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //Get user's location
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach events handlers
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    workoutCards.addEventListener('click', this._moveToPopup.bind(this));

    clearAll.addEventListener('click', this._reset);

    sortBy.addEventListener('click', this._sortWorkouts.bind(this));

    workoutCards.addEventListener('click', this._options.bind(this));

    this._renderWorkout.bind(this);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the current position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    // console.log(`https://www.google.com.mx/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // console.log(coords);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    //   console.log(map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._rederWorkoutMarker(work);
      // this._deleteWorkout(work);
    });
  }

  _renderWorkout(workout) {
    //Create the html
    const html = this._htmlContentCard(workout);
    //Insert the html
    workoutCards.insertAdjacentHTML('beforeend', html);
    //Unhide the sortBy and clear all
    clearAll.closest('.workouts-topBtn').classList.remove('hidden');
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _options(e) {
    //Recieve the event and find the closest li = workout
    const workoutEl = e.target.closest('.workout');
    //Find the closest select
    const options = workoutEl.querySelector('.form__input--options');

    //function
    const ele = () => {
      if (options.options.selectedIndex === 1) {
        const currWork = workoutEl;
        this._editWorkout(currWork);
      }

      if (options.options.selectedIndex === 2) {
        this._deleteWorkout(workoutEl);
      }
    };

    //Render the function each time a selected option change
    options.addEventListener('change', ele);
  }

  _sortWorkouts() {
    //Sort the workouts
    const sorted = this.#workouts.sort((a, b) => b.distance - a.distance);
    //Clear previous html
    workoutCards.innerHTML = '';

    sorted.forEach(workout => {
      //Insert html
      const html = this._htmlContentCard(workout);

      workoutCards.insertAdjacentHTML('beforeend', html);
    });

    this._hideForm();
  }

  _editWorkout(workout) {
    //Receive the objectec
    const w = this.#workouts.find(work => work.id === workout.dataset.id);

    //Store the props
    inputDistance.value = w.distance;
    inputDuration.value = w.duration;
    inputCadence.value = w.cadence;

    //Hide the card
    workout.classList.add('hide');

    //Show form
    this._showForm(w);
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    // console.log(distance);
    const duration = +inputDuration.value;
    let lat, lng;
    if (!this.#mapEvent.coords) {
      console.log(this.#mapEvent.latlng);
      ({ lat, lng } = this.#mapEvent.latlng);
    } else {
      [lat, lng] = this.#mapEvent.coords;
    }
    let workout;

    //Check if data is valid
    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be possitive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be possitive numbers!');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);
    // console.log(workout);

    //Render workout on map as marker
    this._rederWorkoutMarker(workout);

    //Render workout list
    this._renderWorkout(workout);

    //Hide form + Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();

    //Set Options
  }

  _deleteWorkout(workoutEL) {
    if (!workoutEL) return;

    this.#workouts = this.#workouts.filter(
      work => work.id !== workoutEL.dataset.id
    );
    this._setLocalStorage();
    location.reload();
  }

  _rederWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 200,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '} ${workout.description}`
      )
      .openPopup();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animete: true,
      pan: {
        duration: 1,
      },
    });
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _htmlContentCard(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout__header">
        <h2 class="workout__title">${workout.description}</h2>
        <select class="form__input form__input--options">
          <option selected> More options</option>
          <option value="edit">EDIT</option>
          <option value="delete">DELETE</option>
        </select>
      </div>
      <div class="workout__detail--container">
      <div class="workout__details">
        <span class="workout__icon"> ${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(2)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      </div>
    </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
  `;
    return html;
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
