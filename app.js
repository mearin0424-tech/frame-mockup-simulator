/**
 * フレームモックアップシミュレーター - アプリケーションロジック
 */

// 状態管理
let state = {
    frames: [],
    colors: [],
    mats: [], // 追加: 画像マットのリスト
    selectedMatId: null, // 追加: 現在選択されているマットのID
    selectedFrameId: null,
    currentArtDataUrl: null,
    currentArtFileName: '不明なアート.jpg',
    currentTextureFilter: '',
    // ズームとパン
    artScale: 1,
    artOffsetX: 0,
    artOffsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    mattingColor: '#ffffff',
    currentModalDesignId: null
};

// IndexedDB インスタンス
let db;

// DOM 要素
const els = {
    // ナビゲーション
    navSimulator: document.getElementById('nav-simulator'),
    navGallery: document.getElementById('nav-gallery'),
    navAdmin: document.getElementById('nav-admin'),
    sidebarSimulator: document.getElementById('sidebar-simulator-content'),
    sidebarGallery: document.getElementById('sidebar-gallery-content'),
    sidebarAdmin: document.getElementById('sidebar-admin-content'),
    viewSimulator: document.getElementById('view-simulator'),
    viewGallery: document.getElementById('view-gallery'),
    viewAdmin: document.getElementById('view-admin'),

    // 管理画面要素
    addFrameForm: document.getElementById('add-frame-form'),
    frameImageInput: document.getElementById('frame-image'),
    frameImagePreviewName: document.getElementById('frame-image-preview-name'),
    registeredFramesList: document.getElementById('registered-frames-list'),

    // シミュレーターコントロール
    frameSelectorList: document.getElementById('frame-selector-list'),
    textureFilter: document.getElementById('frame-texture-filter'),
    artUpload: document.getElementById('art-upload'),

    // アートのズーム・マット調整
    artControls: document.getElementById('art-controls'),
    artScaleInput: document.getElementById('art-scale'),
    artScaleVal: document.getElementById('art-scale-val'),
    mattingColorPicker: document.getElementById('matting-color-picker'),
    btnCenterArt: document.getElementById('btn-center-art'),

    // キャンバス要素
    canvasWrapper: document.getElementById('simulation-canvas-wrapper'),
    compositionLayer: document.getElementById('mockup-composition'),
    layerArtContainer: document.getElementById('layer-art-container'),
    layerArtImg: document.getElementById('layer-art-img'),
    layerFrameImg: document.getElementById('layer-frame-img'),
    simulatorEmptyState: document.getElementById('simulator-empty-state'),
    simInfoPanel: document.getElementById('simulation-info-panel'),
    btnSaveDesign: document.getElementById('btn-save-design'),

    // 情報パネル
    infoOuterDim: document.getElementById('info-outer-dim'),
    infoInnerDim: document.getElementById('info-inner-dim'),
    infoScaleRatio: document.getElementById('info-scale-ratio'),
    infoPpi: document.getElementById('info-ppi'),
    infoPosition: document.getElementById('info-position'),
    btnRefreshInfo: document.getElementById('btn-refresh-info'),

    // ギャラリー要素
    galleryGrid: document.getElementById('gallery-grid'),
    btnClearGallery: document.getElementById('btn-clear-gallery'),
    galleryModal: document.getElementById('gallery-modal'),
    modalImgMockup: document.getElementById('modal-img-mockup'),
    modalImgArt: document.getElementById('modal-img-art'),
    modalTextMetadata: document.getElementById('modal-text-metadata'),
    modalCloseBtn: document.getElementById('btn-close-modal'),
    btnDeleteDesign: document.getElementById('btn-delete-design')
};

/**
 * 初期化
 */
function init() {
    loadFramesFromStorage();
    initDatabase();
    setupEventListeners();
    renderRegisteredList();
    renderSimulatorFrameList();
    updateTextureFilterOptions();
    switchView('simulator'); // デフォルト表示
    loadColorsFromStorage();
    renderColorOptions();
    loadMatsFromStorage();      // 追記
    renderAdminMatList();       // 追記
    renderSimulatorMatList();   // 追記  
}
/**
 * カラー処理
 */
function loadColorsFromStorage() {
  const saved = localStorage.getItem('mockupColors');
  if (saved) {
    state.colors = JSON.parse(saved);
  } else {
    // 初期カラー（デフォルト）を設定
    state.colors = [
      { name: 'ピュアホワイト', code: '#ffffff' },
      { name: 'ブラック', code: '#000000' }
    ];
  }
}

function saveColorsToStorage() {
  localStorage.setItem('mockupColors', JSON.stringify(state.colors));
}
function renderColorOptions() {
  const select = document.getElementById('matting-color-picker');
  if (!select) return;
  select.innerHTML = ''; // 一旦クリア
  
  state.colors.forEach(color => {
    const option = document.createElement('option');
    option.value = color.code;
    option.textContent = color.name;
    select.appendChild(option);
  });
}
/**
 * ストレージ管理 (LocalStorage)
 */
function loadFramesFromStorage() {
    const saved = localStorage.getItem('mockupFrames');
    if (saved) {
        state.frames = JSON.parse(saved);
    } else {
        state.frames = [];
    }
}

function saveFramesToStorage() {
    localStorage.setItem('mockupFrames', JSON.stringify(state.frames));
}
/**
 * マットの保存・読み込み処理
 */
function loadMatsFromStorage() {
  const savedMats = localStorage.getItem('mockupMats');
  const savedColors = localStorage.getItem('mockupColors'); // 過去のカラーデータを取得

  if (savedMats) {
    state.mats = JSON.parse(savedMats);
  } else {
    state.mats = [];
  }

  // ▼▼▼ 過去のカラーデータを「画像」に自動変換して復元する処理 ▼▼▼
  if (savedColors) {
    const oldColors = JSON.parse(savedColors);
    let isMigrated = false;

    oldColors.forEach(colorItem => {
      // 既に同じ名前で復元されていないかチェック
      if (!state.mats.find(m => m.name === colorItem.name)) {
        
        // カラーコードを使って 10x10 ピクセルの「単色の画像」を裏側で作る
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = colorItem.code;
        ctx.fillRect(0, 0, 10, 10);

        // 新しい「画像マット」のリストに追加
        state.mats.push({
          id: 'old_' + Date.now() + Math.random().toString(36).substr(2, 5),
          name: colorItem.name,
          imageUrl: canvas.toDataURL()
        });
        isMigrated = true;
      }
    });

    // 復元したデータを新しい引き出しに保存
    if (isMigrated) {
      saveMatsToStorage();
    }
  }
  // ▲▲▲ ここまで ▲▲▲
}
function saveMatsToStorage() {
  localStorage.setItem('mockupMats', JSON.stringify(state.mats));
}

/**
 * IndexedDB 管理 (保存済みデザイン用)
 */
function initDatabase() {
    const request = indexedDB.open("MockupDesigns", 1);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains("designs")) {
            db.createObjectStore("designs", { keyPath: "timestamp" });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("データベースが正常に開かれました");
    };

    request.onerror = (event) => {
        console.error("データベースエラー:", event.target.errorCode);
    };
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    
    // ナビゲーション
    els.navSimulator.addEventListener('click', () => switchView('simulator'));
    els.navGallery.addEventListener('click', () => switchView('gallery'));
    els.navAdmin.addEventListener('click', () => switchView('admin'));
    els.btnSaveDesign.addEventListener('click', handleSaveDesign);

    // 管理者フォーム
    els.addFrameForm.addEventListener('submit', handleFrameSubmit);
    els.frameImageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            els.frameImagePreviewName.textContent = e.target.files[0].name;
        } else {
            els.frameImagePreviewName.textContent = '';
        }
    });

    // シミュレーター入力
    els.artUpload.addEventListener('change', handleArtUpload);
    
    els.textureFilter.addEventListener('change', (e) => {
        state.currentTextureFilter = e.target.value;
        renderSimulatorFrameList();
    });

    // カラーピッカー
    if (els.mattingColorPicker) {
        els.mattingColorPicker.addEventListener('input', (e) => {
            state.mattingColor = e.target.value;
            els.layerArtContainer.style.backgroundColor = state.mattingColor;
        });
    }

    // ズームスライダー
    if (els.artScaleInput) {
        els.artScaleInput.addEventListener('input', (e) => {
            state.artScale = e.target.value / 100;
            els.artScaleVal.textContent = e.target.value + '%';
            applyArtTransform();
        });
    }

    // 中央配置ボタン
    if (els.btnCenterArt) {
        els.btnCenterArt.addEventListener('click', () => {
            state.artOffsetX = 0;
            state.artOffsetY = 0;
            applyArtTransform();
            
            if (state.selectedFrameId && state.currentArtDataUrl) {
                updateCompositionCanvas();
            }
        });
    }

    // ドラッグ移動イベント
    els.layerArtContainer.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    // タッチ操作対応
    els.layerArtContainer.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    window.addEventListener('touchmove', (e) => drag(e.touches[0]));
    window.addEventListener('touchend', endDrag);

    // ウィンドウリサイズ対応
    window.addEventListener('resize', () => {
        if (state.selectedFrameId && state.currentArtDataUrl) {
            updateCompositionCanvas();
        }
    });

    // ギャラリーイベント
    if (els.btnClearGallery) {
        els.btnClearGallery.addEventListener('click', () => {
            if (!db) return;
            if (confirm("保存されているすべてのデザインを削除してもよろしいですか？")) {
                const tx = db.transaction("designs", "readwrite");
                tx.objectStore("designs").clear();
                tx.oncomplete = () => renderGallery();
            }
        });
    }

    if (els.btnDeleteDesign) {
        els.btnDeleteDesign.addEventListener('click', () => {
            if (!state.currentModalDesignId || !db) return;
            if (confirm("このデザインを削除しますか？")) {
                const tx = db.transaction("designs", "readwrite");
                tx.objectStore("designs").delete(state.currentModalDesignId);
                tx.oncomplete = () => {
                    els.galleryModal.classList.add('hidden');
                    state.currentModalDesignId = null;
                    renderGallery();
                };
            }
        });
    }

    // モーダルを閉じる
    if (els.modalCloseBtn) {
        els.modalCloseBtn.addEventListener('click', () => {
            els.galleryModal.classList.add('hidden');
        });
    }

    // 情報パネルの更新
    if (els.btnRefreshInfo) {
        els.btnRefreshInfo.addEventListener('click', () => {
            updateCompositionCanvas();
        });
    }
     // ▼▼▼ ここから追加 ▼▼▼
     // 新規カラー登録フォームの送信イベント
        const addColorForm = document.getElementById('add-color-form');
        if (addColorForm) {
            addColorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('color-name').value;
            const code = document.getElementById('color-code').value;
            
            // 状態に追加して保存・UI更新
            state.colors.push({ name, code });
            saveColorsToStorage();
            renderColorOptions();
            
            alert(`カラー「${name}」を登録しました。`);
            addColorForm.reset();
            });
        }
        // ▲▲▲ ここまで追加 ▲▲▲ 
        // マット登録フォームの送信イベント
        const addMatForm = document.getElementById('add-mat-form');
        if (addMatForm) {
            addMatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('mat-name').value;

            // パス入力欄を優先し、空ならファイル選択を使う
            const pathInput = document.getElementById('mat-image-path');
            const rawPath = pathInput ? pathInput.value.trim() : '';
            // 「images/mats/」だけが残っている = 実質未入力扱いにする
            const pathValue = (rawPath === '' || rawPath === 'images/mats/' || rawPath === 'images/mats') ? '' : rawPath;
            const fileInput = document.getElementById('mat-image');
            const file = fileInput.files[0];

            let dataUrl;
            if (pathValue) {
                // ファイル名だけ入力された場合（スラッシュなし）はデフォルトフォルダを補完
                dataUrl = pathValue.includes('/') ? pathValue : 'images/mats/' + pathValue;
            } else if (file) {
                dataUrl = "images/mats/" + file.name;
            } else {
                alert("画像URL（相対パス）を入力するか、マット画像を選択してください。");
                return;
            }

            try {
            const newMat = { id: Date.now().toString(), name, imageUrl: dataUrl };
                
                state.mats.push(newMat);
                state.selectedMatId = newMat.id; // 登録したものを即選択
                
                saveMatsToStorage(); // ←容量オーバーだとここでエラーになる
                
                renderAdminMatList();
                renderSimulatorMatList();
                
                // 【完了メッセージ】無事に保存できた場合のみ、ここが実行されます！
                alert(`マット「${name}」を登録しました。`);
                
                addMatForm.reset();
                if (pathInput) pathInput.value = 'images/mats/';
                updateCompositionCanvas();
                
            } catch (error) {
                console.error("マット画像読み込み・保存エラー", error);
                
                // 容量オーバーだった場合の専用メッセージ
                if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                alert("⚠️ 【容量オーバー】\nブラウザの保存上限に達しました。不要なフレームやマットを削除するか、さらに画像サイズを小さくしてください。");
                state.mats.pop(); // 保存に失敗したので、リストから取り除く
                } else {
                alert("画像の読み込みまたは保存に失敗しました。");
                }
            }
            });
        }
        // シミュレーターのマット選択切り替えイベント
        const matSelector = document.getElementById('mat-selector');
        if (matSelector) {
            matSelector.addEventListener('change', (e) => {
            state.selectedMatId = e.target.value;
            updateCompositionCanvas();
            });
        }
         // ▼▼▼ フレームのエクスポート機能 ▼▼▼
        const btnDownloadRegistry = document.getElementById('btn-download-registry');
        if (btnDownloadRegistry) {
            btnDownloadRegistry.addEventListener('click', () => {
            const dataStr = JSON.stringify(state.frames, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "registry.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            });
        }

        // ▼▼▼ フレームのインポート機能 ▼▼▼
        const importRegistryInput = document.getElementById('import-registry');
        if (importRegistryInput) {
            importRegistryInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                const importedFrames = JSON.parse(event.target.result);
                if (Array.isArray(importedFrames)) {
                    if (confirm('現在のフレーム一覧を、インポートしたデータで上書きしてもよろしいですか？\n（現在のデータは消去されます）')) {
                    state.frames = importedFrames;
                    saveFramesToStorage();
                    renderRegisteredList();
                    renderSimulatorFrameList();
                    updateTextureFilterOptions();
                    alert('フレームデータの一括インポートが完了しました！');
                    }
                } else {
                    alert('無効なファイル形式です。配列のJSONデータが必要です。');
                }
                } catch (err) {
                console.error('JSONパースエラー', err);
                alert('ファイルの読み込みに失敗しました。ファイルが破損しているか、正しいJSONではありません。');
                }
                e.target.value = ''; // 入力をリセット
            };
            reader.readAsText(file);
            });
        }

        // ▼▼▼ マットのエクスポート機能 ▼▼▼
        const btnDownloadMats = document.getElementById('btn-download-mats');
        if (btnDownloadMats) {
            btnDownloadMats.addEventListener('click', () => {
            const dataStr = JSON.stringify(state.mats, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "mats_registry.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            });
        }

        // ▼▼▼ マットのインポート機能 ▼▼▼
        const importMatsInput = document.getElementById('import-mats');
        if (importMatsInput) {
            importMatsInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                const importedMats = JSON.parse(event.target.result);
                if (Array.isArray(importedMats)) {
                    if (confirm('現在のマット一覧を、インポートしたデータで上書きしてもよろしいですか？\n（現在のデータは消去されます）')) {
                    state.mats = importedMats;
                    saveMatsToStorage();
                    renderAdminMatList();
                    renderSimulatorMatList();
                    updateCompositionCanvas();
                    alert('マットデータの一括インポートが完了しました！');
                    }
                } else {
                    alert('無効なファイル形式です。配列のJSONデータが必要です。');
                }
                } catch (err) {
                console.error('JSONパースエラー', err);
                alert('ファイルの読み込みに失敗しました。ファイルが破損しているか、正しいJSONではありません。');
                }
                e.target.value = ''; // 入力をリセット
            };
            reader.readAsText(file);
            });
        }
         // ▼▼▼ 芯材カラー変更イベント ▼▼▼
        const coreColorPicker = document.getElementById('mat-core-color-picker');
        if (coreColorPicker) {
            // 初期値（#ffffff）をシステムに登録
            state.matCoreColor = coreColorPicker.value || '#ffffff';
                
            // 色が変更されたら画面を更新する
            coreColorPicker.addEventListener('input', (e) => {
            state.matCoreColor = e.target.value;
            if (state.selectedFrameId && state.currentArtDataUrl) {
                updateCompositionCanvas();
            }
            });
        }
}

function switchView(viewName) {
    els.navSimulator.classList.remove('active');
    els.navGallery.classList.remove('active');
    els.navAdmin.classList.remove('active');
    els.viewSimulator.classList.add('hidden');
    els.viewGallery.classList.add('hidden');
    els.viewAdmin.classList.add('hidden');
    els.sidebarSimulator.classList.add('hidden');
    els.sidebarGallery.classList.add('hidden');
    els.sidebarAdmin.classList.add('hidden');

    if (viewName === 'simulator') {
        els.navSimulator.classList.add('active');
        els.viewSimulator.classList.remove('hidden');
        els.sidebarSimulator.classList.remove('hidden');
    } else if (viewName === 'gallery') {
        els.navGallery.classList.add('active');
        els.viewGallery.classList.remove('hidden');
        els.sidebarGallery.classList.remove('hidden');
        renderGallery();
    } else if (viewName === 'admin') {
        els.navAdmin.classList.add('active');
        els.viewAdmin.classList.remove('hidden');
        els.sidebarAdmin.classList.remove('hidden');
        renderRegisteredList();
    }
}

/**
 * ドラッグ・パンニングロジック
 */
function startDrag(e) {
    if (!state.currentArtDataUrl) return;
    state.isDragging = true;
    state.dragStartX = e.clientX - state.artOffsetX;
    state.dragStartY = e.clientY - state.artOffsetY;
}

function drag(e) {
    if (!state.isDragging) return;
    state.artOffsetX = e.clientX - state.dragStartX;
    state.artOffsetY = e.clientY - state.dragStartY;
    applyArtTransform();
}

function endDrag() {
    state.isDragging = false;
}

function applyArtTransform() {
  const transformStr = `translate(${state.artOffsetX}px, ${state.artOffsetY}px) scale(${state.artScale})`;
  els.layerArtImg.style.transform = transformStr;
  
  // Vカットレイヤーも一緒に動かし、ズーム時の太さも再計算する
  const vCutLayer = document.getElementById('vcut-layer');
  if (vCutLayer && state.selectedFrameId) {
    vCutLayer.style.transform = transformStr;
    
    const frame = state.frames.find(f => f.id === state.selectedFrameId);
    if (frame && els.compositionLayer.style.width) {
      const renderWidth = parseFloat(els.compositionLayer.style.width);
      const mmToPx = renderWidth / frame.outerWidth;
      const scaledBevelPx = (3 * mmToPx) / state.artScale; 
      const coreColor = state.matCoreColor || '#ffffff';
      
      vCutLayer.style.boxSizing = 'border-box';
      vCutLayer.style.borderStyle = 'solid';
      vCutLayer.style.borderWidth = `${scaledBevelPx}px`;
      vCutLayer.style.borderTopColor = `color-mix(in srgb, ${coreColor}, white 20%)`;
      vCutLayer.style.borderLeftColor = `color-mix(in srgb, ${coreColor}, white 10%)`;
      vCutLayer.style.borderRightColor = `color-mix(in srgb, ${coreColor}, black 15%)`;
      vCutLayer.style.borderBottomColor = `color-mix(in srgb, ${coreColor}, black 25%)`;
      vCutLayer.style.boxShadow = `inset ${scaledBevelPx * 1.0}px ${scaledBevelPx * 1.0}px ${scaledBevelPx * 1.0}px rgba(0, 0, 0, 0.3)`;
    }
  }
}

/**
 * フレーム登録ロジック
 */
async function handleFrameSubmit(e) {
    e.preventDefault();

    // パス入力欄を優先し、空ならファイル選択からファイル名を採用
    const pathInput = document.getElementById('frame-image-path');
    const rawPath = pathInput ? pathInput.value.trim() : '';
    // 「images/frames/」だけが残っている = 実質未入力扱いにする
    const pathValue = (rawPath === '' || rawPath === 'images/frames/' || rawPath === 'images/frames') ? '' : rawPath;
    const file = els.frameImageInput.files[0];

    let dataUrl;
    if (pathValue) {
        // ファイル名だけ入力された場合（スラッシュなし）はデフォルトフォルダを補完
        dataUrl = pathValue.includes('/') ? pathValue : 'images/frames/' + pathValue;
    } else if (file) {
        dataUrl = "images/frames/" + file.name;
    } else {
        alert('画像URL（相対パス）を入力するか、ファイルを選択してください。');
        return;
    }

    try {
    const newFrame = {
            id: 'frame_' + Date.now(),
            name: document.getElementById('frame-name').value,
            texture: document.getElementById('frame-texture').value,
            outerWidth: parseFloat(document.getElementById('outer-width').value),
            outerHeight: parseFloat(document.getElementById('outer-height').value),
            innerWidth: parseFloat(document.getElementById('inner-width').value),
            innerHeight: parseFloat(document.getElementById('inner-height').value),
            imageUrl: dataUrl
        };

        if (newFrame.innerWidth >= newFrame.outerWidth || newFrame.innerHeight >= newFrame.outerHeight) {
            alert('内寸は必ず外寸よりも小さく設定してください。');
            return;
        }

        state.frames.push(newFrame);
        saveFramesToStorage();

        els.addFrameForm.reset();
        if (pathInput) pathInput.value = 'images/frames/';
        els.frameImagePreviewName.textContent = '';

        renderRegisteredList();
        renderSimulatorFrameList();
        updateTextureFilterOptions();

        alert('フレームが正常に登録されました！');

    } catch (error) {
        console.error("ファイル読み込みエラー", error);
        alert('画像の読み込みに失敗しました。');
    }
}

function deleteFrame(id) {
    if (confirm('このフレームを削除してもよろしいですか？')) {
        state.frames = state.frames.filter(f => f.id !== id);
        if (state.selectedFrameId === id) {
            state.selectedFrameId = null;
            updateCompositionCanvas();
        }
        saveFramesToStorage();
        renderRegisteredList();
        renderSimulatorFrameList();
        updateTextureFilterOptions();
    }
}

/**
 * リスト表示のレンダリング
 */
function renderRegisteredList() {
    els.registeredFramesList.innerHTML = '';

    if (state.frames.length === 0) {
        els.registeredFramesList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">登録されているフレームがありません。</p>';
        return;
    }

    state.frames.forEach(frame => {
        const item = document.createElement('div');
        item.className = 'registered-item';

        item.innerHTML = `
            <img src="${frame.imageUrl}" alt="${frame.name}">
            <div class="registered-info">
                <h4>${frame.name}</h4>
                <div class="registered-tags">${frame.texture}</div>
                <p class="registered-dims">外寸: ${frame.outerWidth}x${frame.outerHeight}mm | 内寸: ${frame.innerWidth}x${frame.innerHeight}mm</p>
                <p class="registered-path" style="font-size:0.7rem; color:var(--text-secondary); word-break:break-all; margin:4px 0 0;">パス: ${frame.imageUrl}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button onclick="editFramePath('${frame.id}')" class="secondary-btn" style="padding:4px 8px; font-size:0.75rem;">URL/パス変更</button>
                <button class="delete-btn" onclick="deleteFrame('${frame.id}')">削除</button>
            </div>
        `;
        els.registeredFramesList.appendChild(item);
    });
}

function editFramePath(id) {
    const frame = state.frames.find(f => f.id === id);
    if (!frame) return;
    const newPath = prompt("新しい画像URL（相対パス）を入力してください:", frame.imageUrl);
    if (newPath && newPath.trim() !== '') {
        frame.imageUrl = newPath.trim();
        saveFramesToStorage();
        renderRegisteredList();
        renderSimulatorFrameList();
        if (state.selectedFrameId === id) {
            updateCompositionCanvas();
        }
    }
}

function updateTextureFilterOptions() {
    const textures = [...new Set(state.frames.map(f => f.texture))];
    els.textureFilter.innerHTML = '<option value="">すべてのテクスチャ</option>';

    textures.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        els.textureFilter.appendChild(opt);
    });
}

function renderSimulatorFrameList() {
    els.frameSelectorList.innerHTML = '';

    let filteredFrames = [...state.frames];
    if (state.currentTextureFilter) {
        filteredFrames = filteredFrames.filter(f => f.texture === state.currentTextureFilter);
    }

    let bestMatchId = null;
    if (state.currentArtDataUrl && filteredFrames.length > 0) {
        const img = new Image();
        img.src = state.currentArtDataUrl;

        if (img.width && img.height) {
            const artRatio = img.width / img.height;
            filteredFrames.forEach(f => {
                const frameRatio = f.innerWidth / f.innerHeight;
                f._ratioDiff = Math.abs(artRatio - frameRatio);
            });
            filteredFrames.sort((a, b) => a._ratioDiff - b._ratioDiff);
            bestMatchId = filteredFrames[0].id;
        }
    }

    if (filteredFrames.length === 0) {
        els.frameSelectorList.innerHTML = '<div class="empty-state-small" style="color:var(--text-secondary); padding: 12px; font-size: 0.9rem;">条件に合うフレームがありません。<br>管理画面から追加してください。</div>';
        return;
    }

    filteredFrames.forEach((frame) => {
        const btn = document.createElement('button');
        btn.className = `frame-item-btn ${state.selectedFrameId === frame.id ? 'selected' : ''}`;

        const isRecommended = bestMatchId === frame.id;
        const badgeHtml = isRecommended ? `<span class="recommended-badge">おすすめ ✨</span>` : '';

        btn.innerHTML = `
            <img class="frame-thumb" src="${frame.imageUrl}" alt="${frame.name}">
            <div class="frame-info-mini">
                <strong>${frame.name}</strong>
                <span>${frame.outerWidth}x${frame.outerHeight}mm</span>
            </div>
            ${badgeHtml}
        `;

        btn.addEventListener('click', () => {
            state.selectedFrameId = frame.id;
            document.querySelectorAll('.frame-item-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateCompositionCanvas();
        });

        els.frameSelectorList.appendChild(btn);
    });
}

/**
 * シミュレーターロジック
 */
async function handleArtUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        state.currentArtFileName = file.name;
        state.currentArtDataUrl = await readFileAsDataURL(file);

        const img = new Image();
        img.src = state.currentArtDataUrl;
        await new Promise(r => img.onload = r);

        state.artScale = 1;
        state.artOffsetX = 0;
        state.artOffsetY = 0;
        els.artScaleInput.value = 100;
        els.artScaleVal.textContent = '100%';
        applyArtTransform();

        if (!state.selectedFrameId && state.frames.length > 0) {
            const artRatio = img.width / img.height;
            let closestFrame = state.frames[0];
            let minDiff = Math.abs(artRatio - (closestFrame.innerWidth / closestFrame.innerHeight));

            for (let i = 1; i < state.frames.length; i++) {
                const diff = Math.abs(artRatio - (state.frames[i].innerWidth / state.frames[i].innerHeight));
                if (diff < minDiff) {
                    minDiff = diff;
                    closestFrame = state.frames[i];
                }
            }
            state.selectedFrameId = closestFrame.id;
        }

        renderSimulatorFrameList();
        els.artControls.classList.remove('hidden');
        els.btnSaveDesign.classList.remove('hidden');
        updateCompositionCanvas();
    } catch (error) {
        console.error("アート読み込みエラー", error);
    }
}

/**
 * キャンバスの合成と物理寸法の計算
 */
function updateCompositionCanvas() {
    const frame = state.frames.find(f => f.id === state.selectedFrameId);

    if (!frame || !state.currentArtDataUrl) {
        els.simulatorEmptyState.classList.remove('hidden');
        els.compositionLayer.classList.add('hidden');
        els.simInfoPanel.classList.add('hidden');
        els.artControls.classList.add('hidden');
        return;
    }

    els.simulatorEmptyState.classList.add('hidden');
    els.compositionLayer.classList.remove('hidden');
    els.simInfoPanel.classList.remove('hidden');
    els.artControls.classList.remove('hidden');

    els.layerArtImg.src = state.currentArtDataUrl;
    els.layerFrameImg.src = frame.imageUrl;

    const physicalOuterAspectRatio = frame.outerWidth / frame.outerHeight;
    const maxContainerWidth = els.canvasWrapper.clientWidth * 0.8;
    const maxContainerHeight = els.canvasWrapper.clientHeight * 0.8;
    const containerAspectRatio = maxContainerWidth / maxContainerHeight;

    let renderWidth, renderHeight;

    if (physicalOuterAspectRatio > containerAspectRatio) {
        renderWidth = maxContainerWidth;
        renderHeight = renderWidth / physicalOuterAspectRatio;
    } else {
        renderHeight = maxContainerHeight;
        renderWidth = renderHeight * physicalOuterAspectRatio;
    }

    els.compositionLayer.style.width = `${renderWidth}px`;
    els.compositionLayer.style.height = `${renderHeight}px`;

    const xEdgeMarginMm = (frame.outerWidth - frame.innerWidth) / 2;
    const yEdgeMarginMm = (frame.outerHeight - frame.innerHeight) / 2;
    const leftPercent = (xEdgeMarginMm / frame.outerWidth) * 100;
    const topPercent = (yEdgeMarginMm / frame.outerHeight) * 100;
    const widthPercent = (frame.innerWidth / frame.outerWidth) * 100;
    const heightPercent = (frame.innerHeight / frame.outerHeight) * 100;

    els.layerArtContainer.style.left = `${leftPercent}%`;
    els.layerArtContainer.style.top = `${topPercent}%`;
    els.layerArtContainer.style.width = `${widthPercent}%`;
    els.layerArtContainer.style.height = `${heightPercent}%`;
    // ▼▼▼ ここから（元の backgroundColor = state.mattingColor; を書き換え）▼▼▼
    const selectedMat = state.mats.find(m => m.id === state.selectedMatId);
    if (selectedMat) {
        els.layerArtContainer.style.backgroundImage = `url(${selectedMat.imageUrl})`;
        els.layerArtContainer.style.backgroundSize = 'cover';
        els.layerArtContainer.style.backgroundPosition = 'center';
        els.layerArtContainer.style.backgroundColor = 'transparent';
    } else {
        els.layerArtContainer.style.backgroundImage = 'none';
        els.layerArtContainer.style.backgroundColor = state.mattingColor || '#ffffff';
    }
    // ▼▼▼ フレーム内側の影と、マットのVカット（アート周り）を分けて処理 ▼▼▼
    const mmToPx = renderWidth / frame.outerWidth;
    
    // 1. フレーム自体の内側に落ちる自然な影（元の仕様に復元）
    const frameShadowPx = 2 * mmToPx;
    els.layerArtContainer.style.setProperty(
        '--window-shadow',
        `inset ${frameShadowPx * 0.3}px ${frameShadowPx * 0.3}px ${frameShadowPx}px rgba(0,0,0,0.4)`
    );

    // 2. アート画像にぴったり重なる「Vカット用レイヤー」を作成・取得
    let vCutLayer = document.getElementById('vcut-layer');
    if (!vCutLayer) {
        vCutLayer = document.createElement('div');
        vCutLayer.id = 'vcut-layer';
        vCutLayer.style.position = 'absolute';
        vCutLayer.style.pointerEvents = 'none'; // クリック（ドラッグ）の邪魔にならないように
        els.layerArtContainer.appendChild(vCutLayer);
    }

    // アート画像がフレームと縦横比が違う場合でもぴったりフィットさせるための計算
    const containerW = renderWidth * (frame.innerWidth / frame.outerWidth);
    const containerH = renderHeight * (frame.innerHeight / frame.outerHeight);
    let fitW = containerW;
    let fitH = containerH;
    let fitTop = 0;
    let fitLeft = 0;

    const artImg = els.layerArtImg;
    if (artImg && artImg.naturalWidth) {
        const imgRatio = artImg.naturalWidth / artImg.naturalHeight;
        const containerRatio = containerW / containerH;
        if (imgRatio > containerRatio) {
        fitW = containerW;
        fitH = containerW / imgRatio;
        } else {
        fitH = containerH;
        fitW = containerH * imgRatio;
        }
        fitTop = (containerH - fitH) / 2;
        fitLeft = (containerW - fitW) / 2;
    }

    const overlap = 1.5;
    vCutLayer.style.width = `${fitW + overlap * 2}px`;
    vCutLayer.style.height = `${fitH + overlap * 2}px`;
    vCutLayer.style.top = `${fitTop - overlap}px`;
    vCutLayer.style.left = `${fitLeft - overlap}px`;

    // アートがズームされても常にVカットが約3mmの太さを保つように計算
    const coreColor = state.matCoreColor || '#ffffff';
    const scaledBevelPx = (3 * mmToPx) / state.artScale; 

    // ▼変更点：グラデーションの box-shadow をやめ、border を使ってリアルな斜めカット面（45度）を作る
    vCutLayer.style.boxSizing = 'border-box';
    vCutLayer.style.borderStyle = 'solid';
    vCutLayer.style.borderWidth = `${scaledBevelPx}px`;

    // CSSの color-mix を使い、芯材の色を基準に光（白を少し混ぜる）と影（黒を少し混ぜる）を自動生成
    vCutLayer.style.borderTopColor = `color-mix(in srgb, ${coreColor}, white 20%)`;
    vCutLayer.style.borderLeftColor = `color-mix(in srgb, ${coreColor}, white 10%)`;
    vCutLayer.style.borderRightColor = `color-mix(in srgb, ${coreColor}, black 15%)`;
    vCutLayer.style.borderBottomColor = `color-mix(in srgb, ${coreColor}, black 25%)`;

    // 断面の奥からアートに落ちる影（インナーシャドウ）だけを box-shadow で残す
    vCutLayer.style.boxShadow = `inset ${scaledBevelPx * 1.0}px ${scaledBevelPx * 1.0}px ${scaledBevelPx * 1.0}px rgba(0, 0, 0, 0.3)`;
    
    // 位置やズーム率をアートと完全に同期させる
  vCutLayer.style.transform = `translate(${state.artOffsetX}px, ${state.artOffsetY}px) scale(${state.artScale})`;
  // ▲▲▲ ここまで ▲▲▲

  if (artImg.naturalWidth) {
    // ★修正：画像の読み込み遅延による0割エラー(NaN)を防ぐため、ピクセルを使わず直接mmの比率から計算する
    const scaleMm = Math.min(frame.innerWidth / artImg.naturalWidth, frame.innerHeight / artImg.naturalHeight);
    const artRealWidthMm = artImg.naturalWidth * scaleMm * state.artScale;
    const artRealHeightMm = artImg.naturalHeight * scaleMm * state.artScale;
    
    const physicalInches = artRealWidthMm / 25.4;
    const ppi = Math.round(artImg.naturalWidth / physicalInches);

    // アートのピクセルサイズを取得
    const pxWidth = artImg.naturalWidth;
    const pxHeight = artImg.naturalHeight;

    // 追加したHTML要素に計算結果を表示
    const infoArtSizeEl = document.getElementById('info-art-size');
    if (infoArtSizeEl) {
      infoArtSizeEl.textContent = `${Math.round(artRealWidthMm)} × ${Math.round(artRealHeightMm)} mm (${pxWidth} × ${pxHeight} px)`;
    }
    
    els.infoOuterDim.textContent = `${frame.outerWidth} x ${frame.outerHeight} mm`;
    els.infoInnerDim.textContent = `${frame.innerWidth} x ${frame.innerHeight} mm`;
    els.infoScaleRatio.textContent = `${Math.round(state.artScale * 100)}%`;
    els.infoPpi.textContent = `${ppi} ppi`;

    // ▼▼▼ 解像度判定ロジック ▼▼▼
    const maxDimMm = Math.max(artRealWidthMm, artRealHeightMm);
    let requiredPpi = 180;
    if (maxDimMm <= 297) requiredPpi = 250;
    else if (maxDimMm <= 594) requiredPpi = 240;
    else if (maxDimMm <= 841) requiredPpi = 200;
    else requiredPpi = 180;
    
    const isLowRes = ppi < requiredPpi;
    els.infoPpi.style.color = isLowRes ? 'var(--error-color)' : 'var(--text-primary)';
    if (isLowRes) els.infoPpi.textContent += ' (低解像度)';

    // ▼▼▼ 座標(X,Y)の表示計算（エラー回避付き） ▼▼▼
    const frameImgWidth = els.layerFrameImg.naturalWidth;
    const frameImgHeight = els.layerFrameImg.naturalHeight;
    
    // フレーム画像が読み込まれている時だけ計算する
    if (frameImgWidth > 0) {
      const exportWindowPixelW = frameImgWidth * (frame.innerWidth / frame.outerWidth);
      const exportWindowPixelH = frameImgHeight * (frame.innerHeight / frame.outerHeight);
      const coverScale = Math.min(exportWindowPixelW / pxWidth, exportWindowPixelH / pxHeight);
      
      const exportDrawW = pxWidth * coverScale * state.artScale;
      const exportDrawH = pxHeight * coverScale * state.artScale;

      const mapRatio = exportWindowPixelW / els.layerArtContainer.clientWidth;
      const mappedOffsetX = state.artOffsetX * mapRatio;
      const mappedOffsetY = state.artOffsetY * mapRatio;
      const exportDrawX = ((exportWindowPixelW - exportDrawW) / 2) + mappedOffsetX;
      const exportDrawY = ((exportWindowPixelH - exportDrawH) / 2) + mappedOffsetY;
      
      els.infoPosition.textContent = `${Math.round(exportDrawX)}px, ${Math.round(exportDrawY)}px`;
    } else {
      els.infoPosition.textContent = `計算中...`;
      // 画像がロードされた瞬間に再計算して表示を更新する
      els.layerFrameImg.onload = () => {
        els.layerFrameImg.onload = null;
        updateCompositionCanvas();
      };
    }
  }
}

/**
 * デザイン保存ロジック
 */
async function handleSaveDesign() {
    if (!state.currentArtDataUrl || !state.selectedFrameId || !db) {
        alert("まずアート作品とフレームを選択してください。");
        return;
    }

    els.btnSaveDesign.innerHTML = "保存中...";
    els.btnSaveDesign.disabled = true;

    try {
        const payload = await generateExportPayload();
        
        const xPos = Math.round(payload.metadata.positionX);
        const yPos = Math.round(payload.metadata.positionY);
        const textContent = `使用フレーム: ${payload.metadata.frameName}
        アート名: ${payload.metadata.artFileName}
        フレーム内寸: ${payload.metadata.mmSize} mm
        アートサイズ: ${payload.metadata.artMmSize} mm
        画像解像度: ${payload.metadata.pxSize} px / ${payload.metadata.ppi} ppi
        座標 (X,Y): ${xPos}px, ${yPos}px`;

        const designData = {
            timestamp: new Date().getTime(),
            frameName: payload.metadata.frameName,
            artName: payload.metadata.artFileName,
            metadataText: textContent,
            mockupDataUrl: payload.compositeDataUrl,
            adjustedArtDataUrl: payload.adjustedArtDataUrl
        };

        const tx = db.transaction("designs", "readwrite");
        const store = tx.objectStore("designs");
        const request = store.add(designData);

        request.onsuccess = () => {
            alert("デザインを保存しました！「保存済みデザイン」タブで確認できます。");
            renderGallery();
        };
        request.onerror = (e) => {
            console.error("保存エラー:", e.target.error);
            alert("データベースへの保存に失敗しました。");
        };

    } catch (e) {
        console.error("保存失敗", e);
        alert("デザインの保存に失敗しました。詳細はコンソールを確認してください。");
    } finally {
        els.btnSaveDesign.innerHTML = `<span class="icon">💾</span> デザインを保存`;
        els.btnSaveDesign.disabled = false;
    }
}

function renderGallery() {
    if (!db || !els.galleryGrid) return;

    const tx = db.transaction("designs", "readonly");
    const store = tx.objectStore("designs");
    const request = store.getAll();

    request.onsuccess = (e) => {
        const designs = e.target.result || [];
        
        if (designs.length === 0) {
            els.galleryGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; margin-top: 40px;">
                    <span class="icon">🗂️</span>
                    <h3>保存されたデザインはありません</h3>
                    <p>シミュレーションを行い、「デザインを保存」をクリックするとここに表示されます。</p>
                </div>`;
            return;
        }

        designs.sort((a,b) => b.timestamp - a.timestamp);
        els.galleryGrid.innerHTML = '';

        designs.forEach(design => {
            const div = document.createElement('div');
            div.className = 'card';
            div.style.cursor = 'pointer';
            div.innerHTML = `
                <img src="${design.mockupDataUrl}" style="width: 100%; height: 200px; object-fit: contain; background: #e5e5ea; border-radius: 8px; margin-bottom: 12px;">
                <h4 style="margin: 0 0 4px 0;">${new Date(design.timestamp).toLocaleString('ja-JP')}</h4>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">フレーム: ${design.frameName}</p>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">アート: ${design.artName}</p>
            `;
            div.addEventListener('click', () => openGalleryModal(design));
            els.galleryGrid.appendChild(div);
        });
    };
}

function openGalleryModal(design) {
    els.modalImgMockup.src = design.mockupDataUrl;
    els.modalImgArt.src = design.adjustedArtDataUrl;
    els.modalTextMetadata.textContent = design.metadataText;
    state.currentModalDesignId = design.timestamp;
    els.galleryModal.classList.remove('hidden');
}

async function generateExportPayload() {
    const frame = state.frames.find(f => f.id === state.selectedFrameId);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frameImg = new Image();
    frameImg.src = frame.imageUrl;
    await new Promise(r => frameImg.onload = r);

    const physicalOuterAspectRatio = frame.outerWidth / frame.outerHeight;
    // 印刷推奨の300ppi相当の高画質ピクセル数を計算
    let targetWidth = (frame.outerWidth / 25.4) * 300;
    // パソコンのメモリ不足（フリーズ）を防ぐため、最大6000pxで頭打ちにする
    if (targetWidth > 6000) targetWidth = 6000;
    
    // フレーム画像のサイズか、300ppi相当のサイズの「大きい方」を採用して高画質化
    const exportRenderWidth = Math.max(frameImg.width, targetWidth);
    const exportRenderHeight = exportRenderWidth / physicalOuterAspectRatio;
    const widthPercent = frame.innerWidth / frame.outerWidth;
    const heightPercent = frame.innerHeight / frame.outerHeight;
    const windowPixelW = exportRenderWidth * widthPercent;
    const windowPixelH = exportRenderHeight * heightPercent;

    canvas.width = windowPixelW;
    canvas.height = windowPixelH;

    const artImg = new Image();
    artImg.src = state.currentArtDataUrl;
    await new Promise(r => artImg.onload = r);

    // ▼追加: 選択中のマット画像を裏側でこっそり読み込む
    let matImg = null;
    const selectedMat = state.mats.find(m => m.id === state.selectedMatId);
    if (selectedMat) {
        matImg = new Image();
        matImg.src = selectedMat.imageUrl;
        await new Promise(r => { matImg.onload = r; matImg.onerror = r; });
    }

    // ▼修正箇所1: Math.max を Math.min に変更（シミュレーターと同じ「余白」を正確に両方に再現する）
    const coverScale = Math.min(windowPixelW / artImg.width, windowPixelH / artImg.height);
    const baseW = artImg.width * coverScale;
    const baseH = artImg.height * coverScale;
    const drawW = baseW * state.artScale;
    const drawH = baseH * state.artScale;

    const mapRatio = windowPixelW / els.layerArtContainer.clientWidth;
    const mappedOffsetX = state.artOffsetX * mapRatio;
    const mappedOffsetY = state.artOffsetY * mapRatio;
    const drawX = ((windowPixelW - drawW) / 2) + mappedOffsetX;
    const drawY = ((windowPixelH - drawH) / 2) + mappedOffsetY;

    // ▼追加: 出力時のVカットの太さと色を計算
    const exportBevelPx = 3 * (exportRenderWidth / frame.outerWidth);
    const coreColor = state.matCoreColor || '#ffffff';

    // 調整済みアート抽出キャンバスは、入稿用データとして「白地＋アート画像のみ」で描き込む
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
    ctx.drawImage(artImg, drawX, drawY, drawW, drawH); 

    // ▼修正箇所2: JPEGだと圧縮で白が濁る(FBFBFB等)ため、完全無劣化で純白を保てるPNG形式に変更する
    const adjustedArtDataUrl = canvas.toDataURL('image/png');

    const canvasFull = document.createElement('canvas');
    const ctxFull = canvasFull.getContext('2d');

    canvasFull.width = exportRenderWidth;
    canvasFull.height = exportRenderHeight;

    const xEdgeMarginMm = (frame.outerWidth - frame.innerWidth) / 2;
    const yEdgeMarginMm = (frame.outerHeight - frame.innerHeight) / 2;
    const leftPercent = xEdgeMarginMm / frame.outerWidth;
    const topPercent = yEdgeMarginMm / frame.outerHeight;
    const windowPixelX = canvasFull.width * leftPercent;
    const windowPixelY = canvasFull.height * topPercent;

    // ▼変更: フルモックアップキャンバスにも同様に描き込む
    ctxFull.save();
    ctxFull.beginPath();
    ctxFull.rect(windowPixelX, windowPixelY, windowPixelW, windowPixelH);
    ctxFull.clip(); // 窓枠の外にはみ出さないようにガード

    drawMatBackground(ctxFull, matImg, state.mattingColor, windowPixelX, windowPixelY, windowPixelW, windowPixelH);
    ctxFull.drawImage(artImg, windowPixelX + drawX, windowPixelY + drawY, drawW, drawH);
    drawVCutBevel(ctxFull, windowPixelX + drawX, windowPixelY + drawY, drawW, drawH, exportBevelPx, coreColor);

    ctxFull.restore(); // ガード解除
  ctxFull.drawImage(frameImg, 0, 0, canvasFull.width, canvasFull.height);

  const compositeDataUrl = canvasFull.toDataURL('image/png');

  // ▼▼▼ メタデータに「シミュレーター画面と全く同じ数値」を記録するための計算 ▼▼▼
  // 1. アートの物理サイズ(mm)と解像度(PPI)
  const scaleMm = Math.min(frame.innerWidth / artImg.width, frame.innerHeight / artImg.height);
  const artRealWidthMm = artImg.width * scaleMm * state.artScale;
  const artRealHeightMm = artImg.height * scaleMm * state.artScale;
  const physicalInches = artRealWidthMm / 25.4;
  const originalPpi = Math.round(artImg.width / physicalInches);

  // 2. シミュレーター画面での座標(X,Y)
  const frameImgWidth = frameImg.width;
  const frameImgHeight = frameImg.height;
  const exportWindowPixelW = frameImgWidth * (frame.innerWidth / frame.outerWidth);
  const exportWindowPixelH = frameImgHeight * (frame.innerHeight / frame.outerHeight);
  const simCoverScale = Math.min(exportWindowPixelW / artImg.width, exportWindowPixelH / artImg.height);
  
  const exportDrawW = artImg.width * simCoverScale * state.artScale;
  const exportDrawH = artImg.height * simCoverScale * state.artScale;

  // ★修正: 変数名の重複エラーを回避するため、名前に「sim」を付けました
  const simMapRatio = exportWindowPixelW / els.layerArtContainer.clientWidth;
  const simMappedOffsetX = state.artOffsetX * simMapRatio;
  const simMappedOffsetY = state.artOffsetY * simMapRatio;
  const simDrawX = ((exportWindowPixelW - exportDrawW) / 2) + simMappedOffsetX;
  const simDrawY = ((exportWindowPixelH - exportDrawH) / 2) + simMappedOffsetY;

  const metadata = {
    frameName: frame.name,
    artFileName: state.currentArtFileName,
    pxSize: `${artImg.width}x${artImg.height}`, 
    mmSize: `${frame.innerWidth}x${frame.innerHeight}`,
    artMmSize: `${Math.round(artRealWidthMm)}x${Math.round(artRealHeightMm)}`,
    ppi: originalPpi, 
    positionX: Math.round(simDrawX), 
    positionY: Math.round(simDrawY)  
  };

  return { adjustedArtDataUrl, compositeDataUrl, metadata };
}

/**
 * ユーティリティ
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

// 実行
document.addEventListener('DOMContentLoaded', init);

// シミュレーターのマットアイコン一覧更新
function renderSimulatorMatList() {
  const container = document.getElementById('mat-selector');
  if (!container) return;
  container.innerHTML = '';

  // 1. 「マットなし」のボタンを作成
  const noneBtn = document.createElement('button');
  noneBtn.className = `mat-item-btn ${!state.selectedMatId ? 'selected' : ''}`;
  noneBtn.title = "マットなし"; // ★マウスを乗せた時に名前が出るように
  noneBtn.innerHTML = `
    <div class="mat-item-thumb" style="background: #ffffff; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #999;">なし</div>
  `;
  noneBtn.addEventListener('click', () => {
    state.selectedMatId = null;
    renderSimulatorMatList(); // 選択の青枠を移動させるため再描画
    updateCompositionCanvas();
  });
  container.appendChild(noneBtn);

  // 2. 登録されているマットの画像ボタンを作成
  state.mats.forEach(mat => {
    const btn = document.createElement('button');
    btn.className = `mat-item-btn ${state.selectedMatId === mat.id ? 'selected' : ''}`;
    btn.title = mat.name; // ★マウスを乗せた時に名前が出るように
    // 名前部分のHTMLは出力せず、画像（四角）だけにする
    btn.innerHTML = `
      <img src="${mat.imageUrl}" class="mat-item-thumb" alt="${mat.name}">
    `;
    btn.addEventListener('click', () => {
      state.selectedMatId = mat.id;
      renderSimulatorMatList(); // 選択の青枠を移動させるため再描画
      updateCompositionCanvas();
    });
    container.appendChild(btn);
  });
}

// 管理画面のリスト描画と編集ボタン
function renderAdminMatList() {
  const list = document.getElementById('registered-mats-list');
  if (!list) return;
  list.innerHTML = '';
  
  if (state.mats.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">登録されているマットがありません。</p>';
    return;
  }
  
  state.mats.forEach(mat => {
    const item = document.createElement('div');
    item.className = 'registered-item';
    item.innerHTML = `
      <img src="${mat.imageUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
      <div class="registered-info" style="flex:1;">
        <h4 style="margin: 0 0 4px 0;">${mat.name}</h4>
        <p class="registered-path" style="font-size:0.7rem; color:var(--text-secondary); word-break:break-all; margin:0;">パス: ${mat.imageUrl}</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <button onclick="editMatName('${mat.id}')" class="secondary-btn" style="padding:4px 8px; font-size:0.75rem;">名前編集</button>
        <button onclick="editMatPath('${mat.id}')" class="secondary-btn" style="padding:4px 8px; font-size:0.75rem;">URL/パス変更</button>
        <button onclick="editMatImage('${mat.id}')" class="secondary-btn" style="padding:4px 8px; font-size:0.75rem;">画像変更</button>
        <button onclick="deleteMat('${mat.id}')" class="delete-btn" style="padding:4px 8px; font-size:0.75rem;">削除</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// 編集機能：URL/パスを直接書き換える
function editMatPath(id) {
  const mat = state.mats.find(m => m.id === id);
  if (!mat) return;
  const newPath = prompt("新しい画像URL（相対パス）を入力してください:", mat.imageUrl);
  if (newPath && newPath.trim() !== '') {
    mat.imageUrl = newPath.trim();
    saveMatsToStorage();
    renderAdminMatList();
    renderSimulatorMatList();
    updateCompositionCanvas();
  }
}

// 編集機能：名前の変更
function editMatName(id) {
  const mat = state.mats.find(m => m.id === id);
  const newName = prompt("新しいマット名を入力してください:", mat.name);
  if (newName && newName.trim() !== '') {
    mat.name = newName.trim();
    saveMatsToStorage();
    renderAdminMatList();
    renderSimulatorMatList();
  }
}

// 編集機能：画像の変更（見えないファイル入力を生成して開く）
function editMatImage(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
    input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
        const mat = state.mats.find(m => m.id === id);
        if (!mat) return;
        mat.imageUrl = "images/mats/" + file.name;
        saveMatsToStorage();
      renderAdminMatList();
      renderSimulatorMatList();
      updateCompositionCanvas(); // シミュレーター画面も即時更新
    }
  };
  input.click();
}

// 削除機能
function deleteMat(id) {
  if (confirm('このマットを削除しますか？')) {
    state.mats = state.mats.filter(m => m.id !== id);
    if (state.selectedMatId === id) state.selectedMatId = null;
    saveMatsToStorage();
    renderAdminMatList();
    renderSimulatorMatList();
    updateCompositionCanvas();
  }
}

// ▼▼▼ エクスポート画像描画用の補助関数 ▼▼▼
function drawMatBackground(ctx, matImg, matColor, x, y, w, h) {
  if (matImg) {
    const imgRatio = matImg.width / matImg.height;
    const bgRatio = w / h;
    let mw, mh, mx, my;
    // background-size: cover; と同じように、隙間ができないように画像を拡大・切り抜き計算
    if (imgRatio > bgRatio) {
      mh = h;
      mw = h * imgRatio;
      mx = x + (w - mw) / 2;
      my = y;
    } else {
      mw = w;
      mh = w / imgRatio;
      mx = x;
      my = y + (h - mh) / 2;
    }
    ctx.drawImage(matImg, mx, my, mw, mh);
  } else {
    ctx.fillStyle = matColor || '#ffffff';
    ctx.fillRect(x, y, w, h);
  }
}

function drawVCutBevel(ctx, x, y, w, h, bevelPx, coreColor) {
  ctx.save();
  // 1. 芯材のベースカラーで枠を描画
  ctx.lineWidth = bevelPx;
  ctx.strokeStyle = coreColor;
  ctx.strokeRect(x - bevelPx / 2, y - bevelPx / 2, w + bevelPx, h + bevelPx);

  // 2. 4辺の光と影（45度カット）を半透明のレイヤーで表現
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // 上 (光)
  ctx.beginPath(); ctx.moveTo(x - bevelPx, y - bevelPx); ctx.lineTo(x + w + bevelPx, y - bevelPx); ctx.lineTo(x + w, y); ctx.lineTo(x, y); ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // 左 (光)
  ctx.beginPath(); ctx.moveTo(x - bevelPx, y - bevelPx); ctx.lineTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x - bevelPx, y + h + bevelPx); ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // 右 (影)
  ctx.beginPath(); ctx.moveTo(x + w + bevelPx, y - bevelPx); ctx.lineTo(x + w + bevelPx, y + h + bevelPx); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // 下 (影)
  ctx.beginPath(); ctx.moveTo(x - bevelPx, y + h + bevelPx); ctx.lineTo(x + w + bevelPx, y + h + bevelPx); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();

  // 3. アートに落ちる奥の影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = bevelPx * 1.5;
  ctx.shadowOffsetX = bevelPx * 0.5;
  ctx.shadowOffsetY = bevelPx * 0.5;
  ctx.strokeStyle = 'transparent'; // 影だけを落とすための透明な枠
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
// ▲▲▲ ここまで ▲▲▲