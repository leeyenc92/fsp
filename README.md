# Factory Standard Procedure System (FSPS)

A comprehensive system designed to prevent worker mistakes during component installation through guided procedures, sequence validation, and comprehensive logging.

## 🎯 Main Goals

1. **Prevent Worker Mistakes**: Every component must be scanned before installation
2. **Guided Installation**: Detailed step-by-step installation guides for each component
3. **Sequence Validation**: Alerts and stops workers if components are scanned in wrong order
4. **Comprehensive Logging**: Track time, components installed, errors, and installation counts

## ✨ Features

### Core Functionality
- **Component Scanning**: Barcode/part number scanning system
- **Sequence Validation**: Ensures components are installed in correct order
- **Installation Guides**: Step-by-step instructions for each component
- **Error Prevention**: Stops workers from continuing with incorrect sequences
- **Real-time Progress Tracking**: Visual progress indicators and statistics

### Worker Management
- **Worker Authentication**: Select worker before starting session
- **Session Tracking**: Individual installation sessions for each worker
- **Performance Monitoring**: Track worker efficiency and error rates

### Quality Control
- **Sequence Enforcement**: Prevents installation of components out of order
- **Duplicate Prevention**: Alerts if component is scanned multiple times
- **Error Logging**: Comprehensive error tracking and reporting

### Analytics & Reporting
- **Session Statistics**: Detailed metrics for each installation session
- **Performance Analytics**: Overall system performance and worker efficiency
- **Historical Data**: Complete audit trail of all installations

## 🏗️ System Architecture

### Backend (Node.js + Express)
- **RESTful API**: Comprehensive endpoints for all operations
- **SQLite Database**: Lightweight, file-based database for data persistence
- **Real-time Validation**: Immediate sequence and duplicate checking
- **Comprehensive Logging**: All actions logged with timestamps

### Frontend (Vanilla JavaScript)
- **Modern UI**: Clean, responsive design optimized for factory use
- **Real-time Updates**: Live progress tracking and status updates
- **Mobile-Friendly**: Responsive design works on tablets and mobile devices
- **Intuitive Interface**: Easy-to-use interface for factory workers

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project**
   ```bash
   cd factory-standard-procedure-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

1. **Build the frontend assets**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 📱 How to Use

### 1. Worker Selection
- Select your worker ID from the dropdown
- Click "Start Installation Session"

### 2. Component Scanning
- Scan or enter the part number of the component
- The system validates the sequence automatically
- View detailed installation guide for the component

### 3. Installation Process
- Follow the step-by-step installation guide
- Scan the next component when ready
- System prevents incorrect sequence installation

### 4. Session Completion
- Complete all components in sequence
- Review session statistics
- Complete or reset session as needed

## 🔧 API Endpoints

### Components
- `GET /api/components` - Get all components
- `GET /api/components/:partNumber` - Get specific component

### Workers
- `GET /api/workers` - Get all workers

### Sessions
- `POST /api/sessions` - Start new session
- `POST /api/sessions/:sessionId/scan` - Scan component
- `GET /api/sessions/:sessionId/logs` - Get session logs
- `PUT /api/sessions/:sessionId/complete` - Complete session
- `GET /api/sessions/:sessionId/stats` - Get session statistics
- `GET /api/sessions` - Get all sessions

## 📊 Sample Data

The system comes pre-loaded with sample components and workers:

### Components
1. **Base Plate (BP-001)** - Sequence 1
2. **Motor Mount (MM-002)** - Sequence 2
3. **Drive Belt (DB-003)** - Sequence 3
4. **Control Panel (CP-004)** - Sequence 4
5. **Safety Guard (SG-005)** - Sequence 5

### Workers
- John Smith (EMP001) - Assembly
- Jane Doe (EMP002) - Quality Control
- Mike Johnson (EMP003) - Assembly

## 🛡️ Safety Features

### Sequence Validation
- **Strict Order Enforcement**: Components must be scanned in exact sequence
- **Immediate Feedback**: Instant alerts for sequence violations
- **Process Blocking**: Prevents continuation with incorrect sequences

### Error Prevention
- **Duplicate Detection**: Alerts if component scanned multiple times
- **Validation Rules**: Comprehensive checking before allowing progress
- **Worker Guidance**: Clear instructions and error messages

### Quality Assurance
- **Complete Audit Trail**: Every action logged with timestamp
- **Performance Tracking**: Monitor worker efficiency and error rates
- **Compliance Monitoring**: Ensure standard procedures are followed

## 📈 Monitoring & Analytics

### Real-time Metrics
- **Session Progress**: Live progress bars and component counts
- **Error Tracking**: Immediate error detection and logging
- **Performance Indicators**: Success rates and completion times

### Historical Analysis
- **Session History**: Complete record of all installation sessions
- **Worker Performance**: Individual worker statistics and trends
- **System Analytics**: Overall system efficiency and usage patterns

## 🔒 Security & Data Integrity

### Data Protection
- **SQLite Database**: Reliable, ACID-compliant data storage
- **Input Validation**: Comprehensive validation of all inputs
- **Error Handling**: Graceful error handling and recovery

### Audit Trail
- **Complete Logging**: Every action logged with full context
- **Timestamp Tracking**: Precise timing of all operations
- **Worker Attribution**: All actions linked to specific workers

## 🎨 Customization

### Adding Components
1. Modify the `server.js` file
2. Add new components to the `sampleComponents` array
3. Include: name, part number, description, installation guide, and sequence order

### Modifying Workers
1. Update the `sampleWorkers` array in `server.js`
2. Include: name, employee ID, and department

### Styling Changes
- Modify `src/styles.css` for visual customizations
- Update color schemes, fonts, and layout as needed

## 🚨 Troubleshooting

### Common Issues

**Server won't start**
- Check if port 3000 is available
- Ensure all dependencies are installed
- Check Node.js version compatibility

**Database errors**
- Verify SQLite is working
- Check file permissions for database creation
- Ensure proper database initialization

**Frontend not loading**
- Check if webpack build completed successfully
- Verify all source files are present
- Check browser console for JavaScript errors

### Debug Mode
- Check browser console for frontend errors
- Monitor server console for backend errors
- Use browser developer tools for network inspection

## 🔮 Future Enhancements

### Planned Features
- **Barcode Scanner Integration**: Direct hardware integration
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Machine learning for error prediction
- **Multi-language Support**: Internationalization
- **Cloud Integration**: Remote monitoring and backup

### Scalability Improvements
- **Database Migration**: Support for PostgreSQL/MySQL
- **Microservices**: Modular backend architecture
- **Real-time Updates**: WebSocket integration
- **API Rate Limiting**: Enhanced security and performance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ for manufacturing safety and quality control**
