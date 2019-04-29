import React, { Component } from 'react';
import './App.css';
import { Map, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Card,
  CardTitle,
  CardText,
  Form,
  FormGroup,
  Label,
  Input,
  Button
} from 'reactstrap';
import Joi from '@hapi/joi';
import userLocation from './user_location.svg';
import messageLocation from './message_location.svg';

const myIcon = L.icon({
  iconUrl: userLocation,
  iconSize: [50, 82],
  iconAnchor: [0, 82],
  popupAnchor: [25, -65]
});

const messageIcon = L.icon({
  iconUrl: messageLocation,
  iconSize: [50, 82],
  iconAnchor: [0, 82],
  popupAnchor: [25, -65]
});

const schema = Joi.object().keys({
  name: Joi.string()
    .min(1)
    .max(500)
    .required(),
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
});

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/v1/messages'
    : 'https://api.cesarn.website/api/v1/messages';

class App extends Component {
  state = {
    location: {
      lat: 51.505,
      lng: -0.09
    },
    haveUsersLocation: false,
    zoom: 2,
    userMessage: {
      name: '',
      message: ''
    },
    sendingMessage: false,
    sentMessage: false,
    messages: []
  };

  componentDidMount() {

    fetch(API_URL)
      .then(res => res.json())
      .then(messages => {
        const haveSeenLocation = {};
        messages = messages.reduce((all, message) => {
          const key = `${message.latitude.toFixed(3)}${message.longitude.toFixed(3)}`;
          if(haveSeenLocation[key]){
            haveSeenLocation[key].otherMessages = haveSeenLocation[key].otherMessages || [];
            haveSeenLocation[key].otherMessages.push(message);
          }else{
            haveSeenLocation[key] = message;
            all.push(message);
          }
          return all;
        }, []);

        this.setState({
          messages
        });
      })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          haveUsersLocation: true,
          zoom: 13
        });
        console.log(position);
      },
      () => {
        console.log('sem localização');
        fetch('https://ipapi.co/json')
          .then((res) => res.json())
          .then((location) => {
            console.log(location);
            this.setState({
              location: {
                lat: location.latitude,
                lng: location.longitude
              },
              haveUsersLocation: true,
              zoom: 13
            });
          });
      }
    );
  }

  formIsValid = () => {
    const userMessage = {
      name: this.state.userMessage.name,
      message: this.state.userMessage.message
    };
    const result = Joi.validate(userMessage, schema);

    return !result.error && this.state.haveUsersLocation ? true : false;
  };

  formSubmitted = (event) => {
    event.preventDefault();

    if (this.formIsValid()) {
      
      this.setState({
        sendingMessage: true
      });

      fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: this.state.userMessage.name,
          message: this.state.userMessage.message,
          latitude: this.state.location.lat,
          longitude: this.state.location.lng
        })
      })
        .then((res) => res.json())
        .then((message) => {
          console.log(message);
          setTimeout(() => {
            this.setState({
              sendingMessage: false,
              sentMessage: true
            });
          }, 3000);
        });
    }
  };

  valueChanged = (event) => {
    const { name, value } = event.target;
    this.setState((prevState) => ({
      userMessage: {
        ...prevState.userMessage,
        [name]: value
      }
    }));
  };

  render() {
    const position = [this.state.location.lat, this.state.location.lng];
    return (
      <div className="map">
        <Map className="map" center={position} zoom={this.state.zoom}>
          <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {this.state.haveUsersLocation ? (
            <Marker icon={myIcon} position={position} />
          ) : (
            ''
          )}
          {this.state.messages.map((message) => (
            <Marker
              key={message._id}
              icon={messageIcon}
              position={[message.latitude, message.longitude]}
            >
              <Popup>
                { message.otherMessages ? message.otherMessages.map(message => 
                <p key={message._id}><em>{message.name}:</em> {message.message}</p>
                ) : ''}
              </Popup>
            </Marker>
          ))}
        </Map>
        <Card body className="message-form">
          <CardTitle>Welcome to GuestMap!</CardTitle>
          <CardText>Leave a message with your location!</CardText>
          {!this.state.sendingMessage &&
          !this.state.sentMessage &&
          this.state.haveUsersLocation ? (
            <Form onSubmit={this.formSubmitted}>
              <CardText>Thanks for stopping by!</CardText>
              <FormGroup>
                <Label for="name">Name</Label>
                <Input
                  onChange={this.valueChanged}
                  type="text"
                  name="name"
                  id="name"
                  placeholder="Enter your name"
                />
              </FormGroup>
              <FormGroup>
                <Label for="message">Message</Label>
                <Input
                  onChange={this.valueChanged}
                  type="textarea"
                  name="message"
                  id="message"
                  placeholder="Enter your message"
                />
              </FormGroup>
              <Button
                type="submit"
                color="info"
                disabled={!this.formIsValid()}
              >
                Send
              </Button>
            </Form>
          ) : this.state.sendingMessage || !this.state.haveUsersLocation ? (
            <img
              className="loading"
              src="https://loading.io/spinners/rolling/lg.curve-bars-loading-indicator.gif"
              alt="Loading"
            />
          ) : (
            <CardText>Thanks for your message!</CardText>
          )}
        </Card>
      </div>
    );
  }
}

export default App;
