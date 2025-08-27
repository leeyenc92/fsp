import './styles.css';

import config from './config.js';

class FactoryStandardProcedureSystem {
    constructor() {
        this.currentSession = null;
        this.currentWorker = null;
        this.components = [];
        this.workers = [];
        this.sessionLogs = [];
        
        this.initializeEventListeners();
        this.loadInitialData();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // Worker selection
        document.getElementById('workerSelect').addEventListener('change', (e) => {
            this.handleWorkerSelection(e.target.value);
        });

        document.getElementById('startSessionBtn').addEventListener('click', () => {
            this.startInstallationSession();
        });

        // Component scanning
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.scanComponent();
        });

        document.getElementById('componentScanner').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.scanComponent();
            }
        });

        // Installation completion
        document.getElementById('installCompleteBtn').addEventListener('click', () => {
            this.markInstallationComplete();
        });

        // Session actions
        document.getElementById('completeSessionBtn').addEventListener('click', () => {
            this.completeSession();
        });

        document.getElementById('resetSessionBtn').addEventListener('click', () => {
            this.resetSession();
        });

        // Error handling
        document.getElementById('acknowledgeErrorBtn').addEventListener('click', () => {
            this.acknowledgeError();
        });

        // Modal controls
        document.getElementById('viewStatsBtn').addEventListener('click', () => {
            this.showStatistics();
        });

        document.getElementById('viewSessionsBtn').addEventListener('click', () => {
            this.showAllSessions();
        });
        
        document.getElementById('resetDbBtn').addEventListener('click', () => {
            this.resetDatabase();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    // Load initial data from server
    async loadInitialData() {
        try {
            this.showLoading();
            
            // Load workers and components in parallel
                    const [workersResponse, componentsResponse] = await Promise.all([
            fetch(`${config.API_BASE_URL}/api/workers`),
            fetch(`${config.API_BASE_URL}/api/components`)
        ]);

            if (!workersResponse.ok || !componentsResponse.ok) {
                throw new Error('Failed to load initial data');
            }

            this.workers = await workersResponse.json();
            this.components = await componentsResponse.json();

            this.populateWorkerSelect();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading initial data', 'error');
            this.hideLoading();
        }
    }

    // Populate worker selection dropdown
    populateWorkerSelect() {
        const workerSelect = document.getElementById('workerSelect');
        workerSelect.innerHTML = '<option value="">Select a worker...</option>';
        
        this.workers.forEach(worker => {
            const option = document.createElement('option');
            option.value = worker.id;
            option.textContent = `${worker.name} (${worker.employee_id})`;
            workerSelect.appendChild(option);
        });
    }

    // Handle worker selection
    handleWorkerSelection(workerId) {
        const startSessionBtn = document.getElementById('startSessionBtn');
        startSessionBtn.disabled = !workerId;
        
        if (workerId) {
            this.currentWorker = this.workers.find(w => w.id === workerId);
        }
    }

    // Start new installation session
    async startInstallationSession() {
        if (!this.currentWorker) {
            this.showToast('Sila pilih pekerja terlebih dahulu', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    worker_id: this.currentWorker.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start session');
            }

            this.currentSession = await response.json();
            this.sessionLogs = [];
            
            this.showInstallationSession();
            this.updateSessionInfo();
            this.showToast('Sesi pemasangan bermula dengan jayanya', 'success');
            
        } catch (error) {
            console.error('Error starting session:', error);
            this.showToast('Error starting session', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Show installation session interface
    showInstallationSession() {
        document.getElementById('workerSelection').classList.add('hidden');
        document.getElementById('installationSession').classList.remove('hidden');
        
        // Focus on scanner input
        document.getElementById('componentScanner').focus();
    }

    // Update session information display
    updateSessionInfo() {
        if (!this.currentSession || !this.currentWorker) return;

        document.getElementById('sessionWorker').textContent = `Worker: ${this.currentWorker.name}`;
        document.getElementById('sessionTime').textContent = `Started: ${this.formatTime(this.currentSession.start_time)}`;
        document.getElementById('sessionStatus').textContent = `Status: ${this.currentSession.status}`;
    }

    // Scan component
    async scanComponent() {
        const partNumber = document.getElementById('componentScanner').value.trim();
        
        if (!partNumber) {
            this.showToast('Sila masukkan nombor bahagian', 'warning');
            return;
        }

        if (!this.currentSession) {
            this.showToast('No active session', 'error');
            return;
        }

        // Remove any existing warning message when scanning any component
        this.removeWarningMessage();

        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions/${this.currentSession.session_id}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ partNumber })
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.isAlreadyInstalled) {
                    this.showToast('Komponen sudah dipasang. Sila periksa semula.', 'warning');
                    this.displayAlreadyInstalledComponent(result.component);
                    this.disableScannerForAlreadyInstalled();
                    
                    // Count as error and update stats
                    this.sessionLogs.push({
                        component: result.component,
                        scanTime: new Date().toISOString(),
                        isSequenceCorrect: false,
                        errorMessage: 'Komponen sudah dipasang',
                        isRepeatedScan: true
                    });
                    this.updateSessionStats();
                } else if (result.isSequenceError) {
                    this.showToast(`Komponen ini sudah diimbas dengan ralat urutan: ${result.errorMessage}`, 'error');
                    this.displayError(result.errorMessage, 0);
                    
                    // Count as error and update stats
                    this.sessionLogs.push({
                        component: result.component,
                        scanTime: new Date().toISOString(),
                        isSequenceCorrect: false,
                        errorMessage: result.errorMessage,
                        isRepeatedScan: true
                    });
                    this.updateSessionStats();
                    
                    // Disable scanner temporarily
                    document.getElementById('componentScanner').disabled = true;
                    document.getElementById('scanBtn').disabled = true;
                    setTimeout(() => {
                        document.getElementById('componentScanner').disabled = false;
                        document.getElementById('scanBtn').disabled = false;
                    }, 3000);
                } else if (result.isDuplicate) {
                    this.showToast('Component already scanned', 'warning');
                    this.displayComponent(result.component, true);
                    
                    // Count as error and update stats
                    this.sessionLogs.push({
                        component: result.component,
                        scanTime: new Date().toISOString(),
                        isSequenceCorrect: false,
                        errorMessage: 'Komponen sudah diimbas',
                        isRepeatedScan: true
                    });
                    this.updateSessionStats();
                } else {
                    throw new Error(result.error || 'Scan failed');
                }
                return;
            }

            // Add to session logs
            this.sessionLogs.push({
                component: result.component,
                scanTime: result.scanTime,
                isSequenceCorrect: result.isSequenceCorrect,
                errorMessage: result.errorMessage
            });

            // Check if worker is blocked
            if (result.isBlocked) {
                this.displayBlockedError(result.errorMessage, result.wrongScansCount);
                this.updateSessionStats();
                return;
            }

                         // Check for sequence errors
             if (!result.isSequenceCorrect) {
                 this.displayError(result.errorMessage, result.wrongScansCount);
                 this.updateSessionStats();
                 
                 // Don't show installation guide for incorrect sequence
                 this.hideComponentDisplay();
                 
                 // Clear scanner input and show error message
                 document.getElementById('componentScanner').value = '';
                 this.showToast(`Urutan salah: ${result.errorMessage}`, 'error');
                 
                 // If sequence is incorrect, don't allow scanning until it's fixed
                 if (!result.canScan) {
                     document.getElementById('componentScanner').disabled = true;
                     document.getElementById('scanBtn').disabled = true;
                 }
             } else {
                 this.hideError();
                 this.updateSessionStats();
                 
                 // Only show installation guide if sequence is correct and not blocked
                 if (result.showInstallationGuide) {
                     this.currentComponent = result.component;
                     this.displayComponent(result.component, false);
                     this.showToast(`Komponen ${result.component.name} diimbas dengan jayanya. Selesaikan pemasangan sebelum mengimbas komponen seterusnya.`, 'success');
                     
                     // Disable scanner until installation is complete
                     document.getElementById('componentScanner').disabled = true;
                     document.getElementById('scanBtn').disabled = true;
                 }
             }

            // Clear scanner input
            document.getElementById('componentScanner').value = '';
            document.getElementById('componentScanner').focus();

        } catch (error) {
            console.error('Error scanning component:', error);
            this.showToast(`Error scanning component: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Display component information
    displayComponent(component, isDuplicate = false) {
        const currentComponent = document.getElementById('currentComponent');
        
        document.getElementById('componentName').textContent = component.name;
        document.getElementById('componentPartNumber').textContent = component.part_number;
        document.getElementById('componentDescription').textContent = component.description;
        document.getElementById('sequenceOrder').textContent = component.sequence_order;
        
        // Format installation guide
        const guideSteps = document.getElementById('guideSteps');
        guideSteps.textContent = component.installation_guide;
        
        currentComponent.classList.remove('hidden');
        
        // Always show the install complete button for correct sequence components
        document.getElementById('installCompleteBtn').style.display = 'block';
        
        if (isDuplicate) {
            currentComponent.style.borderColor = '#f59e0b';
            currentComponent.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
        } else {
            currentComponent.style.borderColor = '#0ea5e9';
            currentComponent.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
        }
    }

    // Display already installed component
    displayAlreadyInstalledComponent(component) {
        const currentComponent = document.getElementById('currentComponent');
        
        document.getElementById('componentName').textContent = component.name;
        document.getElementById('componentPartNumber').textContent = component.part_number;
        document.getElementById('componentDescription').textContent = component.description;
        document.getElementById('sequenceOrder').textContent = component.sequence_order;
        
        // Show already installed message instead of installation guide
        const guideSteps = document.getElementById('guideSteps');
        guideSteps.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc2626;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2em; margin-bottom: 10px;"></i>
                <h4 style="color: #dc2626; margin: 0;">Komponen Sudah Dipasang!</h4>
                <p style="margin: 10px 0; color: #6b7280;">
                    Komponen ini telah ditandakan sebagai dipasang dalam sesi ini.
                    Sila periksa semula urutan pemasangan anda.
                </p>
            </div>
        `;
        
        // Hide the install complete button
        document.getElementById('installCompleteBtn').style.display = 'none';
        
        currentComponent.classList.remove('hidden');
        currentComponent.style.borderColor = '#dc2626';
        currentComponent.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)';
    }

    // Disable scanner for already installed component temporarily
    disableScannerForAlreadyInstalled() {
        const scanner = document.getElementById('componentScanner');
        const scanBtn = document.getElementById('scanBtn');
        
        scanner.disabled = true;
        scanBtn.disabled = true;
        
        // Add warning message below scanner
        const scannerSection = document.querySelector('.scanner-section');
        let warningMsg = scannerSection.querySelector('.already-installed-warning');
        
        if (!warningMsg) {
            warningMsg = document.createElement('div');
            warningMsg.className = 'already-installed-warning';
            warningMsg.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 10px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="color: #dc2626; margin-right: 8px;"></i>
                    <span style="color: #dc2626; font-weight: 500;">
                        Anda telah mengimbas komponen yang sudah dipasang. Sila periksa semula urutan pemasangan.
                    </span>
                    <div style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                        Scanner akan diaktifkan semula dalam 3 saat...
                    </div>
                </div>
            `;
            scannerSection.appendChild(warningMsg);
        }
        
        // Re-enable scanner after 3 seconds
        setTimeout(() => {
            scanner.disabled = false;
            scanBtn.disabled = false;
            
            // Update warning message
            if (warningMsg) {
                warningMsg.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 10px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="color: #dc2626; margin-right: 8px;"></i>
                        <span style="color: #dc2626; font-weight: 500;">
                            Anda telah mengimbas komponen yang sudah dipasang. Sila periksa semula urutan pemasangan.
                        </span>
                        <div style="margin-top: 8px; font-size: 0.9em; color: #6b7280;">
                            Scanner telah diaktifkan semula. Anda boleh terus mengimbas.
                        </div>
                    </div>
                `;
            }
        }, 3000);
    }

    // Remove warning message
    removeWarningMessage() {
        const warningMsg = document.querySelector('.already-installed-warning');
        if (warningMsg) {
            warningMsg.remove();
        }
    }

    // Display error message
    displayError(errorMessage, wrongScansCount) {
        const errorDisplay = document.getElementById('errorDisplay');
        const errorMessageEl = document.getElementById('errorMessage');
        
        // Update error message with wrong scan count
        errorMessageEl.innerHTML = `
            ${errorMessage}<br><br>
            <strong>Imbasan salah dalam sesi ini: ${wrongScansCount}/3</strong><br>
            ${wrongScansCount >= 2 ? '<span style="color: #dc2626;">⚠️ AMARAN: Satu lagi imbasan salah akan menyekat sesi ini!</span>' : ''}
        `;
        
        errorDisplay.classList.remove('hidden');
        
        // Disable scanner until error is acknowledged
        document.getElementById('componentScanner').disabled = true;
        document.getElementById('scanBtn').disabled = true;
    }

    // Display blocked error (after 3 wrong scans)
    displayBlockedError(errorMessage, wrongScansCount) {
        const errorDisplay = document.getElementById('errorDisplay');
        const errorMessageEl = document.getElementById('errorMessage');
        
        // Update error message for blocked worker
        errorMessageEl.innerHTML = `
            <div style="color: #dc2626; font-size: 1.2em; margin-bottom: 1rem;">
                🚫 <strong>SESI DISEKAT</strong> 🚫
            </div>
            ${errorMessage}<br><br>
            <strong>Imbasan salah dalam sesi ini: ${wrongScansCount}/3</strong><br>
            <span style="color: #dc2626; font-weight: bold;">
                ⚠️ KRITIKAL: Anda telah melebihi had maksimum imbasan salah.<br>
                Sesi ini kini disekat. Sila hubungi penyelia anda.
            </span>
        `;
        
        errorDisplay.classList.remove('hidden');
        
        // Completely disable scanner and all session actions
        document.getElementById('componentScanner').disabled = true;
        document.getElementById('scanBtn').disabled = true;
        document.getElementById('completeSessionBtn').disabled = true;
        document.getElementById('resetSessionBtn').disabled = true;
        
        // Show critical error toast
        this.showToast('SESI DISEKAT: Had maksimum imbasan salah terlampaui. Hubungi penyelia.', 'error');
    }

    // Hide error display
    hideError() {
        document.getElementById('errorDisplay').classList.add('hidden');
        document.getElementById('componentScanner').disabled = false;
        document.getElementById('scanBtn').disabled = false;
    }

    // Acknowledge error and continue
    acknowledgeError() {
        // Check if worker is blocked
        const wrongScansCount = this.sessionLogs.filter(log => !log.isSequenceCorrect).length;
        
        if (wrongScansCount >= 3) {
            this.showToast('Sesi disekat. Hubungi penyelia anda untuk teruskan.', 'error');
            return;
        }
        
        // Check if the next component in sequence can be scanned
        const lastInstalledLog = this.sessionLogs.find(log => log.status === 'installed');
        const nextSequenceOrder = lastInstalledLog ? lastInstalledLog.component.sequence_order + 1 : 1;
        
        // Only re-enable scanner if the worker can scan the next component in sequence
        if (nextSequenceOrder <= this.components.length) {
            this.hideError();
            this.showToast('Ralat diakui. Anda boleh terus mengimbas komponen seterusnya dalam urutan.', 'info');
        } else {
            this.showToast('Ralat diakui. Sila selesaikan pemasangan komponen semasa sebelum mengimbas komponen seterusnya.', 'warning');
        }
    }

    // Hide component display
    hideComponentDisplay() {
        document.getElementById('currentComponent').classList.add('hidden');
    }

    // Mark installation as complete
    async markInstallationComplete() {
        if (!this.currentSession || !this.currentComponent) {
            this.showToast('Tiada komponen aktif untuk ditandakan sebagai dipasang', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions/${this.currentSession.session_id}/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    componentId: this.currentComponent.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to mark installation complete');
            }

            // Update local session logs
            const logIndex = this.sessionLogs.findIndex(log => log.component.id === this.currentComponent.id);
            if (logIndex !== -1) {
                this.sessionLogs[logIndex].status = 'installed';
                this.sessionLogs[logIndex].installTime = new Date().toISOString();
            }

            // Hide component display and show success message
            this.hideComponentDisplay();
            this.showToast(`Komponen ${this.currentComponent.name} ditandakan sebagai dipasang dengan jayanya`, 'success');
            
            // Update session stats
            this.updateSessionStats();
            
            // Clear current component
            this.currentComponent = null;
            
            // Enable scanner for next component
            document.getElementById('componentScanner').disabled = false;
            document.getElementById('scanBtn').disabled = false;
            
        } catch (error) {
            console.error('Error marking installation complete:', error);
            this.showToast(`Error marking installation complete: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Update session statistics
    updateSessionStats() {
        const totalScanned = this.sessionLogs.length;
        const totalInstalled = this.sessionLogs.filter(log => log.status === 'installed').length;
        const errorCount = this.sessionLogs.filter(log => !log.isSequenceCorrect).length;
        const progressPercentage = (totalInstalled / this.components.length) * 100;

        document.getElementById('componentsCount').textContent = `${totalInstalled}/${this.components.length}`;
        document.getElementById('errorsCount').textContent = `${errorCount}/3`;
        document.getElementById('progressFill').style.width = `${progressPercentage}%`;

        // Update progress bar color based on errors
        const progressFill = document.getElementById('progressFill');
        if (errorCount >= 3) {
            progressFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
        } else if (errorCount > 0) {
            progressFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
        }

        // Update progress stats text color based on error count
        const errorsCountEl = document.getElementById('errorsCount');
        if (errorCount >= 3) {
            errorsCountEl.style.color = '#dc2626';
            errorsCountEl.style.fontWeight = 'bold';
        } else if (errorCount >= 2) {
            errorsCountEl.style.color = '#d97706';
            errorsCountEl.style.fontWeight = 'bold';
        } else {
            errorsCountEl.style.color = '#64748b';
            errorsCountEl.style.fontWeight = '500';
        }
        
        // Check if session should be blocked due to repeated scans
        if (errorCount >= 3) {
            this.checkAndBlockSession();
        }
    }

    // Check and block session if too many errors
    checkAndBlockSession() {
        const errorCount = this.sessionLogs.filter(log => !log.isSequenceCorrect).length;
        
        if (errorCount >= 3) {
            // Block the session
            this.displayBlockedError('Terlalu banyak ralat imbasan', errorCount);
            
            // Disable all session actions
            document.getElementById('componentScanner').disabled = true;
            document.getElementById('scanBtn').disabled = true;
            document.getElementById('completeSessionBtn').disabled = true;
            document.getElementById('resetSessionBtn').disabled = true;
            
            // Remove any existing warning messages
            const warningMsg = document.querySelector('.already-installed-warning');
            if (warningMsg) {
                warningMsg.remove();
            }
        }
    }

    // Complete installation session
    async completeSession() {
        if (!this.currentSession) {
            this.showToast('No active session', 'error');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions/${this.currentSession.session_id}/complete`, {
                method: 'PUT'
            });

            if (!response.ok) {
                throw new Error('Failed to complete session');
            }

            this.showToast('Sesi selesai dengan jayanya', 'success');
            this.resetToWorkerSelection();
            
        } catch (error) {
            console.error('Error completing session:', error);
            this.showToast('Error completing session', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Reset session
    resetSession() {
        // Check if worker is blocked
        const wrongScansCount = this.sessionLogs.filter(log => !log.isSequenceCorrect).length;
        
        if (wrongScansCount >= 3) {
            if (confirm('Sesi ini disekat kerana banyak imbasan salah. Menetapkan semula akan membersihkan sekatan dan membolehkan anda bermula semula. Teruskan?')) {
                this.resetToWorkerSelection();
            }
        } else {
            if (confirm('Adakah anda pasti mahu set semula sesi ini? Semua kemajuan akan hilang.')) {
                this.resetToWorkerSelection();
            }
        }
    }

    // Reset to worker selection screen
    resetToWorkerSelection() {
        this.currentSession = null;
        this.currentWorker = null;
        this.currentComponent = null;
        this.sessionLogs = [];
        
        document.getElementById('installationSession').classList.add('hidden');
        document.getElementById('workerSelection').classList.remove('hidden');
        document.getElementById('currentComponent').classList.add('hidden');
        document.getElementById('errorDisplay').classList.add('hidden');
        
        // Reset form
        document.getElementById('workerSelect').value = '';
        document.getElementById('componentScanner').value = '';
        document.getElementById('startSessionBtn').disabled = true;
        
        // Reset progress
        document.getElementById('componentsCount').textContent = '0/5';
        document.getElementById('errorsCount').textContent = '0/3';
        document.getElementById('progressFill').style.width = '0%';
        
        // Reset scanner state
        document.getElementById('componentScanner').disabled = false;
        document.getElementById('scanBtn').disabled = false;
        
        // Remove already installed warning message
        const warningMsg = document.querySelector('.already-installed-warning');
        if (warningMsg) {
            warningMsg.remove();
        }
        
        // Reset install complete button
        const installBtn = document.getElementById('installCompleteBtn');
        installBtn.style.display = 'block';
    }

    // Show statistics modal
    async showStatistics() {
        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions`);
            if (!response.ok) {
                throw new Error('Failed to load sessions');
            }

            const sessions = await response.json();
            this.displayStatistics(sessions);
            document.getElementById('statsModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading statistics:', error);
            this.showToast('Error loading statistics', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Display statistics
    displayStatistics(sessions) {
        const statsContent = document.getElementById('statsContent');
        
        // Calculate overall statistics
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'completed').length;
        const totalComponents = sessions.reduce((sum, s) => sum + s.components_installed, 0);
        const avgComponentsPerSession = totalSessions > 0 ? (totalComponents / totalSessions).toFixed(1) : 0;

        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${totalSessions}</h3>
                    <p>Jumlah Sesi</p>
                </div>
                <div class="stat-card">
                    <h3>${completedSessions}</h3>
                    <p>Sesi Selesai</p>
                </div>
                <div class="stat-card">
                    <h3>${totalComponents}</h3>
                    <p>Jumlah Komponen</p>
                </div>
                <div class="stat-card">
                    <h3>${avgComponentsPerSession}</h3>
                    <p>Purata Komponen/Sesi</p>
                </div>
            </div>
            
            <h3>Sesi Terkini</h3>
            <div class="sessions-table-container">
                <table class="sessions-table">
                    <thead>
                                                 <tr>
                             <th>Pekerja</th>
                             <th>Masa Mula</th>
                             <th>Status</th>
                             <th>Komponen</th>
                         </tr>
                    </thead>
                    <tbody>
                        ${sessions.slice(0, 10).map(session => `
                            <tr>
                                <td>${session.worker_name}</td>
                                <td>${this.formatTime(session.start_time)}</td>
                                <td><span class="status-badge ${session.status}">${session.status}</span></td>
                                <td>${session.components_installed}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        statsContent.innerHTML = statsHTML;
    }

    // Show all sessions modal
    async showAllSessions() {
        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/sessions`);
            if (!response.ok) {
                throw new Error('Failed to load sessions');
            }

            const sessions = await response.json();
            this.displayAllSessions(sessions);
            document.getElementById('sessionsModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showToast('Error loading sessions: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // Reset database for testing
    async resetDatabase() {
        if (!confirm('Adakah anda pasti mahu reset database? Semua data akan hilang dan komponen demo akan dijana semula.')) {
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(`${config.API_BASE_URL}/api/reset-db`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to reset database');
            }
            
            this.showToast('Database berjaya direset dengan komponen demo yang betul', 'success');
            
            // Reload initial data
            await this.loadInitialData();
            
            // Reset to worker selection if in session
            if (this.currentSession) {
                this.resetToWorkerSelection();
            }
            
        } catch (error) {
            console.error('Error resetting database:', error);
            this.showToast('Error resetting database: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Display all sessions
    displayAllSessions(sessions) {
        const sessionsContent = document.getElementById('sessionsContent');
        
        const sessionsHTML = `
            <h3>Semua Sesi Pemasangan (${sessions.length})</h3>
            <div class="sessions-table-container">
                <table class="sessions-table">
                    <thead>
                        <tr>
                            <th>Pekerja</th>
                            <th>ID Pekerja</th>
                            <th>Masa Mula</th>
                            <th>Masa Tamat</th>
                            <th>Status</th>
                            <th>Komponen</th>
                            <th>Ralat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => `
                            <tr>
                                <td>${session.worker_name}</td>
                                <td>${session.employee_id}</td>
                                <td>${this.formatTime(session.start_time)}</td>
                                <td>${session.end_time ? this.formatTime(session.end_time) : '-'}</td>
                                <td><span class="status-badge ${session.status}">${session.status}</span></td>
                                <td>${session.components_installed}</td>
                                <td>${session.errors_count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        sessionsContent.innerHTML = sessionsHTML;
    }

    // Close modal
    closeModal(modal) {
        modal.classList.add('hidden');
    }

    // Show loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    // Format timestamp
    formatTime(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FactoryStandardProcedureSystem();
});
