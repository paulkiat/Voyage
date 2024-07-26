# Voyage AI

Voyage AI is a comprehensive travel itinerary planner that offers a seamless user experience through a single-page application (SPA). This project leverages HTML, CSS, and vanilla JavaScript to dynamically load content and ensure smooth navigation without page reloads.

## Features

- User Profile Management
- Travel Preferences
- Predefined and Custom Travel Packages
- Real-Time Booking and Itinerary Management
- Notifications and Support
- Responsive Design for Mobile Compatibility

## Getting Started

### Prerequisites

- Git
- A code editor (VSCode, Sublime Text, etc.)
- A web browser

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/paulkiat/Voyage.git
   cd VoyageAI
   ```

2. Open the project in your code editor.

3. Open `index.html` in your browser to view the application.

### Usage

- Navigate through different sections using the top navigation bar.
- Each navigation item will load the corresponding modal with dynamic content.

### Project Structure

```
VoyageAI/
├── assets/
│   ├── css/           # CSS styles for the application
│   │   └── styles.css
│   ├── images/        # Image assets for the application
│   │   └── logo-128.png
├── components/        # HTML components for each section
│   ├── dashboard.html
│   ├── profile.html
│   ├── preferences.html
│   ├── packages.html
│   ├── custom-trip.html
│   ├── support.html
├── scripts/           # JavaScript files for functionality
│   └── app.js
├── index.html         # Main HTML file
└── README.md          # Project documentation
```

### Testing

1. **Set up the testing environment:**
   - Install dependencies (if any):
     ```bash
     npm install
     ```

2. **Run tests:**
   - Execute tests to ensure everything is working correctly:
     ```bash
     npm test
     ```

3. **Writing new tests:**
   - Add new tests in the `tests/` directory following the existing conventions.

### Documentation

- Generate documentation using JSDoc:
  ```bash
  npm run doc
  ```
- Update documentation as necessary to reflect changes in the codebase.

### Contributing

1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/YourFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeature
   ```
5. Open a pull request.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Acknowledgments

- Inspired by modern travel planning applications.
- Thanks to all contributors and users for their support and feedback.

**.github/workflows/deploy.yml:**

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    - name: Setup Node.js environment
      uses: actions/setup-node@v2
      with:
        node-version: '14'

    - name: Install dependencies
      run: npm install

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Build and deploy
      run: npm run build && npm run deploy
```
