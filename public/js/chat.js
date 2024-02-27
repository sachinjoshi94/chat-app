const socket = io();

const chatForm = document.querySelector("#chatForm");
const chatBox = document.querySelector("#message");
const messageButton = document.querySelector("#sendMessage");
const locationButton = document.querySelector("#sendLocation");
const messages = document.querySelector("#messages");

const messageTemplate = document.querySelector("#messageTemplate");
const locationTemplate = document.querySelector("#locationTemplate");
const sidebarTemplate = document.querySelector("#sidebarTemplate");

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  const newMessage = messages.lastElementChild;

  // calculate height of the last message element
  const newMessageStyles = getComputedStyle(newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin;

  // visible and total height of the chat window
  const visibleHeight = messages.offsetHeight;
  const containerHeight = messages.scrollHeight;

  // How far we scrolled from the top of our message container
  const scrollOffset = messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    messages.scrollTop = messages.scrollHeight;
  }
};

const locationSuccessCb = (position) => {
  socket.emit(
    "share-location",
    {
      lat: position.coords.latitude,
      long: position.coords.longitude,
    },
    () => {
      console.log("Location shared successfully!");
    }
  );
};

const locationFailCb = (positionError) => {
  console.log(`Error while fetching location: ${positionError}`);
};

const formatDateTime = (timestamp) => {
  return moment(timestamp).format("h:mm a");
};

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  messageButton.setAttribute("disabled", true);
  const message = chatBox.value;
  socket.emit("sendMessage", { message }, (error) => {
    messageButton.removeAttribute("disabled");
    chatBox.value = "";
    chatBox.focus();
    if (error) {
      return console.log(error);
    }
    console.log("Message delivered!");
  });
});

locationButton.addEventListener("click", (event) => {
  if (!navigator.geolocation)
    return alert("Your browser does not support geolocation");

  locationButton.setAttribute("disabled", true);
  navigator.geolocation.getCurrentPosition(locationSuccessCb, locationFailCb);
  locationButton.removeAttribute("disabled");
});

socket.on("message", (message) => {
  const clone = messageTemplate.content.cloneNode(true);

  if (message.username === username) {
    clone.firstElementChild.classList.add("right");
  }
  const tempDiv = document.createElement("div");
  tempDiv.append(clone.firstElementChild);

  const html = Mustache.render(tempDiv.innerHTML, {
    username: message.username,
    message: message.text,
    createdAt: formatDateTime(message.createdAt),
  });

  tempDiv.remove();
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("location-shared", (response) => {
  const clone = locationTemplate.content.cloneNode(true);

  if (response.username === username) {
    alert("yes");
    clone.firstElementChild.classList.add("right");
  }
  const tempDiv = document.createElement("div");
  tempDiv.append(clone.firstElementChild);

  const html = Mustache.render(tempDiv.innerHTML, {
    username: response.username,
    url: response.url,
    createdAt: formatDateTime(response.createdAt),
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate.innerHTML, {
    room,
    users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    window.location = "/";
  }
});
