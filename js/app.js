// app.js

// Core Application Class
class WriteSenseApp {
  constructor() {
    this.editor = null;
    this.currentDocument = null;
    this.collaborators = new Map();
    this.aiAssistant = null;
    this.voiceRecorder = null;
    this.socket = null;
    this.undoStack = [];
    this.redoStack = [];
    this.userPreferences = null;
    this.init();
  }

  // Initialization
  async init() {
    try {
      await this.initializeServices();
      this.setupEventListeners();
      this.loadUserPreferences();
      this.initializeEditor();
      this.setupWebSocket();
      this.setupAIAssistant();
      this.setupVoiceInput();
      this.startAutoSave();
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showErrorNotification('Failed to initialize application');
    }
  }

  // Document Management
  async createNewDocument() {
    try {
      const doc = await this.documentService.create({
        title: 'Untitled Document',
        content: '',
        userId: this.getCurrentUser().id
      });
      this.loadDocument(doc.id);
      this.showNotification('New document created');
    } catch (error) {
      this.handleError(error);
    }
  }

  async saveDocument() {
    if (!this.currentDocument) return;

    try {
      const content = this.editor.getContent();
      await this.documentService.save(this.currentDocument.id, {
        content,
        lastModified: new Date(),
        version: this.currentDocument.version + 1
      });
      this.updateDocumentStatus('saved');
    } catch (error) {
      this.handleError(error);
    }
  }

  // Editor Controls
  formatText(format) {
    const selection = this.editor.getSelection();
    if (!selection) return;

    switch (format) {
      case 'bold':
        this.editor.toggleBold();
        break;
      case 'italic':
        this.editor.toggleItalic();
        break;
      case 'underline':
        this.editor.toggleUnderline();
        break;
      // Add more formatting options
    }
    this.trackChange(`Applied ${format} formatting`);
  }

  // Collaboration Features
  setupWebSocket() {
    this.socket = new WebSocket(process.env.WS_URL);
    this.socket.onmessage = this.handleWebSocketMessage.bind(this);
    this.setupHeartbeat();
  }

  handleCollaboratorJoin(user) {
    this.collaborators.set(user.id, user);
    this.updateCollaboratorsList();
    this.showNotification(`${user.name} joined the document`);
  }

  handleCollaboratorLeave(userId) {
    this.collaborators.delete(userId);
    this.updateCollaboratorsList();
  }

  // AI Assistant Integration
  setupAIAssistant() {
    this.aiAssistant = new AIAssistant({
      onSuggestion: this.handleAISuggestion.bind(this),
      onError: this.handleAIError.bind(this)
    });
  }

  async analyzeText(text) {
    try {
      const suggestions = await this.aiAssistant.analyze(text);
      this.updateSuggestionsList(suggestions);
    } catch (error) {
      this.handleError(error);
    }
  }

  applySuggestion(suggestionId) {
    const suggestion = this.aiAssistant.getSuggestion(suggestionId);
    if (!suggestion) return;

    this.editor.applyChange(suggestion);
    this.trackChange('Applied AI suggestion');
  }

  // Voice Input
  setupVoiceInput() {
    this.voiceRecorder = new VoiceRecorder({
      onTranscription: this.handleTranscription.bind(this),
      onError: this.handleVoiceError.bind(this)
    });
  }

  async startVoiceInput() {
    try {
      await this.voiceRecorder.start();
      this.updateVoiceInputStatus('recording');
    } catch (error) {
      this.handleError(error);
    }
  }

  // Template Management
  async loadTemplates() {
    try {
      const templates = await this.templateService.getAll();
      this.renderTemplatesList(templates);
    } catch (error) {
      this.handleError(error);
    }
  }

  applyTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    this.editor.setContent(template.content);
    this.trackChange('Applied template');
  }

  // History Management
  trackChange(description) {
    const change = {
      timestamp: new Date(),
      description,
      content: this.editor.getContent(),
      selection: this.editor.getSelection()
    };
    this.undoStack.push(change);
    this.redoStack = [];
    this.updateToolbarState();
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const change = this.undoStack.pop();
    this.redoStack.push({
      timestamp: new Date(),
      content: this.editor.getContent(),
      selection: this.editor.getSelection()
    });

    this.editor.setContent(change.content);
    this.editor.setSelection(change.selection);
    this.updateToolbarState();
  }

  // Export/Import
  async exportDocument(format) {
    try {
      const content = this.editor.getContent();
      const exported = await this.exportService.convert(content, format);
      this.downloadFile(exported, format);
    } catch (error) {
      this.handleError(error);
    }
  }

  async importDocument(file) {
    try {
      const content = await this.importService.parse(file);
      this.editor.setContent(content);
      this.trackChange('Imported document');
    } catch (error) {
      this.handleError(error);
    }
  }

  // User Preferences
  loadUserPreferences() {
    this.userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || this.getDefaultPreferences();
    this.applyUserPreferences();
  }

  saveUserPreferences() {
    localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
    this.applyUserPreferences();
  }

  // UI Updates
  updateToolbarState() {
    const selection = this.editor.getSelection();
    const buttons = document.querySelectorAll('.toolbar-btn');

    buttons.forEach(button => {
      const format = button.dataset.format;
      const isActive = this.editor.isFormatActive(format);
      button.classList.toggle('active', isActive);
      button.disabled = !selection && !this.editor.canApplyFormat(format);
    });
  }

  updateCollaboratorsList() {
    const container = document.querySelector('.collaborators');
    container.innerHTML = Array.from(this.collaborators.values())
      .map(user => this.renderCollaborator(user))
      .join('');
  }

  // Error Handling
  handleError(error) {
    console.error('Application error:', error);
    this.showErrorNotification(error.message);
  }

  // Utility Functions
  getTimestamp() {
    return new Date().toISOString();
  }

  getCurrentUser() {
    return {
      id: 'user123',
      name: 'SyncFocus17',
      preferences: this.userPreferences
    };
  }

  // Event Listeners
  setupEventListeners() {
    document.querySelectorAll('.toolbar-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.formatText(format);
      });
    });

    document.querySelector('.btn-voice').addEventListener('click', () => {
      this.startVoiceInput();
    });

    // Add more event listeners
  }

  // Cleanup
  destroy() {
    this.socket?.close();
    this.editor?.destroy();
    this.voiceRecorder?.stop();
    this.stopAutoSave();
  }
}

// Initialize the application
const app = new WriteSenseApp();

// Export for use in other modules
export default app;
