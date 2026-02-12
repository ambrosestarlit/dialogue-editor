// Dialogue Editor - 2人掛け合い特化シナリオエディタ
const app = {
    currentProject: null,
    characters: [],
    
    init() {
        this.loadRecentProjects();
        this.setupEventListeners();
        this.showWelcome();
    },

    setupEventListeners() {
        const editor = document.getElementById('contentEditor');
        const projectNameInput = document.getElementById('projectNameInput');
        
        if (editor) {
            editor.addEventListener('input', () => {
                this.updateStats();
                this.autoSave();
            });
        }
        
        if (projectNameInput) {
            projectNameInput.addEventListener('input', () => {
                this.autoSave();
            });
        }
    },

    // ================ プロジェクト管理 ================
    
    showWelcome() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        this.updateRecentProjectsList();
    },

    hideWelcome() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    },

    createNewProject() {
        const name = prompt('プロジェクト名を入力してください:', `プロジェクト_${new Date().toLocaleDateString('ja-JP')}`);
        if (!name) return;
        
        this.currentProject = name;
        this.characters = [];
        
        document.getElementById('projectNameInput').value = name;
        document.getElementById('contentEditor').value = '';
        
        this.hideWelcome();
        this.updateCharacterButtons();
        this.updateStats();
        this.saveProject();
        this.showStatus(`プロジェクト「${name}」を作成しました`);
    },

    loadProjectDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dep,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importProjectFile(file);
            }
        };
        input.click();
    },

    importProjectFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const projectName = file.name.replace(/\.(dep|json)$/, '');
                
                localStorage.setItem(`dialogue_project_${projectName}`, e.target.result);
                this.loadProject(projectName);
                this.showStatus(`ファイル「${file.name}」を読み込みました`);
            } catch (error) {
                alert(`ファイルの読み込みに失敗しました。\nエラー: ${error.message}`);
            }
        };
        reader.readAsText(file);
    },

    loadProject(name) {
        const data = localStorage.getItem(`dialogue_project_${name}`);
        if (!data) {
            this.showStatus('プロジェクトが見つかりません');
            return;
        }
        
        const project = JSON.parse(data);
        
        this.currentProject = name;
        this.characters = project.characters || [];
        
        document.getElementById('projectNameInput').value = project.name || name;
        document.getElementById('contentEditor').value = project.content || '';
        
        this.hideWelcome();
        this.updateCharacterButtons();
        this.updateStats();
        this.showStatus(`プロジェクト「${name}」を読み込みました`);
    },

    saveProject() {
        if (!this.currentProject) return;
        
        const projectName = document.getElementById('projectNameInput').value || this.currentProject;
        
        const project = {
            name: projectName,
            content: document.getElementById('contentEditor').value,
            characters: this.characters,
            lastModified: new Date().toISOString()
        };
        
        localStorage.setItem(`dialogue_project_${this.currentProject}`, JSON.stringify(project));
        this.saveToRecentProjects();
        this.showStatus('保存しました');
        
        alert(`プロジェクト「${projectName}」を保存しました。`);
    },

    autoSave() {
        if (!this.currentProject) return;
        
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            const projectName = document.getElementById('projectNameInput').value || this.currentProject;
            
            const project = {
                name: projectName,
                content: document.getElementById('contentEditor').value,
                characters: this.characters,
                lastModified: new Date().toISOString()
            };
            
            localStorage.setItem(`dialogue_project_${this.currentProject}`, JSON.stringify(project));
        }, 2000);
    },

    exportTxt() {
        if (!this.currentProject) {
            this.showStatus('プロジェクトが開かれていません');
            return;
        }
        
        const projectName = document.getElementById('projectNameInput').value || this.currentProject;
        const content = document.getElementById('contentEditor').value;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showStatus('TXTファイルをエクスポートしました');
    },

    returnToWelcome() {
        if (confirm('プロジェクトをウェルカム画面に戻りますか？\n（現在の内容は自動保存されています）')) {
            this.showWelcome();
        }
    },

    deleteProject(name) {
        if (!confirm(`プロジェクト「${name}」を削除しますか？`)) return;
        
        localStorage.removeItem(`dialogue_project_${name}`);
        const projects = this.getRecentProjects().filter(p => p.name !== name);
        localStorage.setItem('dialogue_recent_projects', JSON.stringify(projects));
        this.updateRecentProjectsList();
        this.showStatus('プロジェクトを削除しました');
    },

    // ================ 最近使用したプロジェクト ================
    
    loadRecentProjects() {
        const stored = localStorage.getItem('dialogue_recent_projects');
        return stored ? JSON.parse(stored) : [];
    },

    getRecentProjects() {
        return this.loadRecentProjects();
    },

    saveToRecentProjects() {
        const projects = this.getRecentProjects();
        const projectName = document.getElementById('projectNameInput').value || this.currentProject;
        const content = document.getElementById('contentEditor').value;
        
        const existing = projects.findIndex(p => p.name === this.currentProject);
        
        const projectData = {
            name: this.currentProject,
            displayName: projectName,
            lastModified: new Date().toISOString(),
            charCount: content.length
        };
        
        if (existing >= 0) {
            projects[existing] = projectData;
        } else {
            projects.unshift(projectData);
        }
        
        localStorage.setItem('dialogue_recent_projects', JSON.stringify(projects.slice(0, 10)));
    },

    updateRecentProjectsList() {
        const list = document.getElementById('recentProjectsList');
        const projects = this.getRecentProjects();
        
        list.innerHTML = '';
        
        if (projects.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-size: 12px;">最近使用したプロジェクトはありません</div>';
            return;
        }
        
        projects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'welcome-recent-item';
            item.innerHTML = `
                <div class="welcome-recent-info">
                    <div class="welcome-recent-name">${project.displayName || project.name}</div>
                    <div class="welcome-recent-date">${new Date(project.lastModified).toLocaleString('ja-JP')}</div>
                </div>
                <button class="welcome-recent-delete" onclick="app.deleteProject('${project.name}'); event.stopPropagation();">×</button>
            `;
            item.onclick = () => {
                this.loadProject(project.name);
            };
            list.appendChild(item);
        });
    },

    // ================ キャラクター管理 ================
    
    addCharacter(index) {
        if (this.characters.length >= 4) {
            alert('キャラクターは最大4人まで登録できます');
            return;
        }
        
        const input = document.getElementById(`charInput${index + 1}`);
        const name = input.value.trim();
        
        if (!name) {
            alert('キャラクター名を入力してください');
            return;
        }
        
        if (this.characters.includes(name)) {
            alert('同じ名前のキャラクターが既に登録されています');
            return;
        }
        
        this.characters.push(name);
        input.value = '';
        
        this.updateCharacterButtons();
        this.updateStats();
        this.autoSave();
        this.showStatus(`キャラクター「${name}」を追加しました`);
    },

    removeCharacter(name) {
        if (!confirm(`キャラクター「${name}」を削除しますか？`)) return;
        
        this.characters = this.characters.filter(c => c !== name);
        this.updateCharacterButtons();
        this.updateStats();
        this.autoSave();
        this.showStatus(`キャラクター「${name}」を削除しました`);
    },

    insertCharacterName(name) {
        const editor = document.getElementById('contentEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        const insert = `${name}：　`;
        editor.value = before + insert + after;
        editor.selectionStart = editor.selectionEnd = start + insert.length;
        editor.focus();
        
        this.updateStats();
        this.autoSave();
    },

    updateCharacterButtons() {
        const container = document.getElementById('characterButtons');
        container.innerHTML = '';
        
        this.characters.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'char-btn';
            btn.textContent = name;
            btn.onclick = () => this.insertCharacterName(name);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'char-btn-delete';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeCharacter(name);
            };
            
            btn.appendChild(deleteBtn);
            container.appendChild(btn);
        });
    },

    // ================ テキスト挿入機能 ================
    
    insertText(text) {
        const editor = document.getElementById('contentEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const currentText = editor.value;
        const before = currentText.substring(0, start);
        const after = currentText.substring(end);
        
        editor.value = before + text + after;
        editor.selectionStart = editor.selectionEnd = start + text.length;
        editor.focus();
        
        this.updateStats();
        this.autoSave();
    },

    insertStageDirection() {
        this.insertText('// ');
    },

    insertScene() {
        this.insertText('〇 ');
    },

    insertBlackout() {
        this.insertText('【暗転】\n');
    },

    // ================ 連番機能 ================
    
    insertNumbering() {
        const editor = document.getElementById('contentEditor');
        const lines = editor.value.split('\n');
        let counter = 1;
        
        const processed = lines.map(line => {
            // "名前：" で始まる行を検出
            const match = line.match(/^([^：]+)：(.*)$/);
            if (match) {
                const charName = match[1].trim();
                const dialogue = match[2];
                
                // 既に番号がついている場合は除去
                const withoutNumber = charName.replace(/^\d{3}\s*/, '');
                
                // 3桁の番号を追加
                const numbered = String(counter).padStart(3, '0');
                counter++;
                
                return `${numbered} ${withoutNumber}：${dialogue}`;
            }
            return line;
        });
        
        editor.value = processed.join('\n');
        this.updateStats();
        this.autoSave();
        this.showStatus(`${counter - 1}行に連番を付与しました`);
    },

    // ================ 統計機能 ================
    
    updateStats() {
        const content = document.getElementById('contentEditor').value;
        const lines = content.split('\n');
        
        // 総文字数
        const totalChars = content.length;
        
        // 行数
        const lineCount = lines.length;
        
        // キャラクターごとの文字数を計算
        const charStats = {};
        this.characters.forEach(name => {
            charStats[name] = 0;
        });
        
        lines.forEach(line => {
            this.characters.forEach(name => {
                // "名前：" のパターンにマッチする行を検出
                const pattern = new RegExp(`^\\d{0,3}\\s*${name}：(.*)$`);
                const match = line.match(pattern);
                if (match) {
                    // セリフ部分の文字数をカウント（括弧を除く）
                    const dialogue = match[1].replace(/[()（）]/g, '');
                    charStats[name] += dialogue.length;
                }
            });
        });
        
        // UIを更新
        document.getElementById('totalCharCount').textContent = totalChars;
        document.getElementById('lineCount').textContent = lineCount;
        document.getElementById('statTotal').textContent = totalChars;
        
        // キャラクター別統計を更新
        const statsGrid = document.getElementById('statsGrid');
        
        // 総文字数の要素を保持
        const totalStatElement = statsGrid.querySelector('.stat-item');
        statsGrid.innerHTML = '';
        statsGrid.appendChild(totalStatElement);
        
        // キャラクター別の統計を追加
        this.characters.forEach(name => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <div class="stat-label">${name}</div>
                <div class="stat-value">${charStats[name]}</div>
            `;
            statsGrid.appendChild(statItem);
        });
    },

    // ================ ユーティリティ ================
    
    showStatus(message) {
        const statusText = document.getElementById('statusText');
        const projectName = document.getElementById('projectNameInput')?.value || this.currentProject || '新規';
        statusText.textContent = `プロジェクト: ${projectName} | ${message}`;
        
        setTimeout(() => {
            statusText.textContent = `プロジェクト: ${projectName}`;
        }, 3000);
    }
};

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
