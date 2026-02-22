# Interactive DSA & ML Learning

A standalone interactive learning application that visualizes Data Structures & Algorithms (DSA) and Machine Learning (ML) concepts using **Three.js** and **GSAP** animations.

## 🎯 Features

- **Side-by-side layout**: Explanations on the left, 3D animations on the right
- **Interactive 3D visualizations** using Three.js
- **Smooth animations** powered by GSAP
- **Multiple topics** covering DSA and ML fundamentals
- **Completely standalone** - works offline after setup

## 📚 Available Topics

### Data Structures & Algorithms

- **Binary Search** - Visualize the divide-and-conquer search algorithm
- **Linked List** - See node traversal in action
- **Sorting** - Watch bubble sort organize data step-by-step

### Machine Learning

- **Linear Regression** - Understand line fitting to data points
- **Gradient Descent** - Visualize optimization on a 3D surface
- **Neural Networks** - See forward propagation through layers

## 🚀 Getting Started

### Prerequisites

- Node.js (for npm package management)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run the application**:

   ```bash
   npm start
   ```

   This will start a local server and open the application in your browser.

### Alternative: Direct File Access

You can also open `index.html` directly in your browser, but you may need to run a local server due to ES6 module restrictions:

```bash
# Using Python
python -m http.server 8080

# Using Node.js http-server
npx http-server -p 8080
```

Then navigate to `http://localhost:8080`

## 📦 Project Structure

```
interactive-learning-standalone/
├── index.html              # Main HTML file
├── package.json            # Dependencies
├── css/
│   └── style.css          # Styling
├── js/
│   ├── main.js            # Application controller
│   ├── topicData.js       # Topic explanations
│   └── animations.js      # Three.js animations
└── node_modules/          # Dependencies (Three.js, GSAP)
```

## 🎨 How to Use

1. **Select a category**: Choose between DSA or ML
2. **Enter a topic**: Type a topic name or click an example tag
3. **Click Generate**: Watch the explanation and animation appear
4. **Explore**: Try different topics to learn interactively!

## 🛠️ Technologies Used

- **Three.js** (v0.160.0) - 3D graphics and rendering
- **GSAP** (v3.12.5) - Smooth animations and transitions
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with gradients and effects

## 📤 Sharing This Project

To share this project with others:

1. **Zip the entire folder**:
   - Include all files and the `node_modules` folder
   - Or share without `node_modules` and have recipients run `npm install`

2. **Recipients can**:
   - Extract the zip file
   - Run `npm install` (if node_modules not included)
   - Run `npm start` or open `index.html` via a local server

## 🎓 Educational Use

This project is perfect for:

- Students learning DSA and ML concepts
- Teachers demonstrating algorithms visually
- Self-learners who prefer visual explanations
- Anyone preparing for technical interviews

## 📝 Adding New Topics

To add a new topic:

1. **Add explanation** in `js/topicData.js`:

   ```javascript
   'your topic': {
       explanation: `<h3>Your Topic</h3>...`,
       animation: 'yourAnimation'
   }
   ```

2. **Create animation** in `js/animations.js`:

   ```javascript
   animateYourTopic() {
       this.init();
       // Your Three.js animation code
   }
   ```

3. **Update example tags** in `topicData.js`:
   ```javascript
   exampleTopics: {
       dsa: [..., 'Your Topic']
   }
   ```

## 🐛 Troubleshooting

**Issue**: Animations not showing

- **Solution**: Make sure you're running via a local server, not opening the HTML file directly

**Issue**: Module errors

- **Solution**: Run `npm install` to ensure dependencies are installed

**Issue**: Blank screen

- **Solution**: Check browser console for errors, ensure Three.js and GSAP are loaded

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Credits

Built with ❤️ using Three.js and GSAP

---

**Enjoy learning with interactive visualizations!** 🚀
