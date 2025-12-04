<template>
  <div class="reader-settings" :class="{ 'is-open': isOpen }">
    <button
      class="settings-toggle"
      @click="toggleSettings"
      :title="isOpen ? '关闭设置' : '打开设置'"
    >
      <span class="icon">⚙️</span>
    </button>

    <transition name="slide">
      <div v-if="isOpen" class="settings-panel">
        <div class="settings-header">
          <h3>阅读设置</h3>
          <button class="close-btn" @click="toggleSettings">✕</button>
        </div>

        <div class="settings-content">
          <!-- 字体大小 -->
          <div class="setting-group">
            <label class="setting-label">字体大小</label>
            <div class="setting-control">
              <button
                @click="decreaseFontSize"
                class="control-btn"
                :disabled="fontSize <= 12"
              >
                A-
              </button>
              <span class="setting-value">{{ fontSize }}px</span>
              <button
                @click="increaseFontSize"
                class="control-btn"
                :disabled="fontSize >= 32"
              >
                A+
              </button>
            </div>
          </div>

          <!-- 阅读模式 -->
          <div class="setting-group">
            <label class="setting-label">阅读模式</label>
            <div class="setting-control mode-control">
              <button
                v-for="mode in readingModes"
                :key="mode.value"
                @click="changeReadingMode(mode.value)"
                :class="['mode-btn', { active: readingMode === mode.value }]"
                :style="{ backgroundColor: mode.bg, color: mode.text }"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <!-- 行高 -->
          <div class="setting-group">
            <label class="setting-label">行高</label>
            <div class="setting-control">
              <button
                @click="decreaseLineHeight"
                class="control-btn"
                :disabled="lineHeight <= 1.0"
              >
                -
              </button>
              <span class="setting-value">{{ lineHeight.toFixed(1) }}</span>
              <button
                @click="increaseLineHeight"
                class="control-btn"
                :disabled="lineHeight >= 3.0"
              >
                +
              </button>
            </div>
          </div>

          <!-- 页面宽度 -->
          <div class="setting-group">
            <label class="setting-label">页面宽度</label>
            <div class="setting-control">
              <button
                @click="decreasePageWidth"
                class="control-btn"
                :disabled="pageWidth <= 600"
              >
                -
              </button>
              <span class="setting-value">{{ pageWidth }}px</span>
              <button
                @click="increasePageWidth"
                class="control-btn"
                :disabled="pageWidth >= 1200"
              >
                +
              </button>
            </div>
          </div>

          <!-- 字体 -->
          <div class="setting-group">
            <label class="setting-label">字体</label>
            <select
              v-model="fontFamily"
              @change="changeFontFamily"
              class="setting-select"
            >
              <option value="serif">宋体（Serif）</option>
              <option value="sans-serif">黑体（Sans-serif）</option>
              <option value="monospace">等宽（Monospace）</option>
              <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
              <option value="'SimSun', serif">宋体</option>
              <option value="'SimHei', sans-serif">黑体</option>
              <option value="'KaiTi', serif">楷体</option>
            </select>
          </div>

          <!-- 重置按钮 -->
          <div class="setting-group">
            <button @click="resetSettings" class="reset-btn">
              恢复默认设置
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { ElMessageBox, ElNotification } from "element-plus";
import { useSettingsStore } from "@/stores/settings";

const settingsStore = useSettingsStore();
const isOpen = ref(false);

// 阅读模式选项
const readingModes = [
  { value: "default", label: "默认", bg: "#ffffff", text: "#333333" },
  { value: "night", label: "夜间", bg: "#1a1a1a", text: "#cccccc" },
  { value: "sepia", label: "护眼", bg: "#f4ecd8", text: "#5c4a3a" },
  { value: "green", label: "绿色", bg: "#cce8cc", text: "#1a3a1a" },
];

// 从store获取设置
const fontSize = computed(() => settingsStore.fontSize);
const readingMode = computed(() => settingsStore.readingMode);
const lineHeight = computed(() => settingsStore.lineHeight);
const pageWidth = computed(() => settingsStore.pageWidth);
const fontFamily = ref(settingsStore.fontFamily);

const toggleSettings = () => {
  isOpen.value = !isOpen.value;
};

// 字体大小控制
const increaseFontSize = async () => {
  const newSize = Math.min(fontSize.value + 1, 32);
  await settingsStore.updateSetting("fontSize", newSize);
};

const decreaseFontSize = async () => {
  const newSize = Math.max(fontSize.value - 1, 12);
  await settingsStore.updateSetting("fontSize", newSize);
};

// 阅读模式控制
const changeReadingMode = async (mode) => {
  await settingsStore.updateSetting("readingMode", mode);

  // 根据模式设置背景色和文字色
  const modeConfig = readingModes.find((m) => m.value === mode);
  if (modeConfig) {
    await settingsStore.updateSettings({
      readingMode: mode,
      backgroundColor: modeConfig.bg,
      textColor: modeConfig.text,
    });
    applyReadingMode(modeConfig);
  }
};

// 应用阅读模式到页面
const applyReadingMode = (modeConfig) => {
  document.documentElement.style.setProperty(
    "--reader-bg-color",
    modeConfig.bg
  );
  document.documentElement.style.setProperty(
    "--reader-text-color",
    modeConfig.text
  );
};

// 行高控制
const increaseLineHeight = async () => {
  const newHeight = Math.min(lineHeight.value + 0.1, 3.0);
  await settingsStore.updateSetting(
    "lineHeight",
    parseFloat(newHeight.toFixed(1))
  );
};

const decreaseLineHeight = async () => {
  const newHeight = Math.max(lineHeight.value - 0.1, 1.0);
  await settingsStore.updateSetting(
    "lineHeight",
    parseFloat(newHeight.toFixed(1))
  );
};

// 页面宽度控制
const increasePageWidth = async () => {
  const newWidth = Math.min(pageWidth.value + 50, 1200);
  await settingsStore.updateSetting("pageWidth", newWidth);
};

const decreasePageWidth = async () => {
  const newWidth = Math.max(pageWidth.value - 50, 600);
  await settingsStore.updateSetting("pageWidth", newWidth);
};

// 字体更改
const changeFontFamily = async () => {
  await settingsStore.updateSetting("fontFamily", fontFamily.value);
};

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm("确定要恢复默认设置吗？", "恢复默认设置", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const result = await settingsStore.resetSettings();
    if (result.success) {
      fontFamily.value = settingsStore.fontFamily;
      // 重新应用默认的阅读模式
      const defaultMode = readingModes.find((m) => m.value === "default");
      if (defaultMode) {
        applyReadingMode(defaultMode);
      }
      ElNotification({
        title: "恢复成功",
        message: "设置已恢复为默认值",
        type: "success",
        position: "top-right"
      });
    } else {
      ElNotification({
        title: "恢复失败",
        message: result.message,
        type: "error",
        position: "top-right"
      });
    }
  } catch {
    // 用户点击了取消按钮，不需要处理
  }
};

// 监听阅读模式变化，自动应用
watch(
  readingMode,
  (newMode) => {
    const modeConfig = readingModes.find((m) => m.value === newMode);
    if (modeConfig) {
      applyReadingMode(modeConfig);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.reader-settings {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.settings-toggle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #fdf4ff;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.settings-toggle:hover {
  background: #ffffff;
  transform: scale(1.1);
}

.settings-toggle .icon {
  font-size: 24px;
}

.settings-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 320px;
  max-height: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
}

.close-btn:hover {
  color: #333;
}

.settings-content {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 10px;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: all 0.2s ease;
  min-width: 40px;
}

.control-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.setting-value {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.mode-control {
  flex-wrap: wrap;
}

.mode-btn {
  flex: 1;
  min-width: 60px;
  padding: 8px 12px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.mode-btn.active {
  border-color: transparent;
  box-shadow: 0 0 0 1px #828282;
}

.mode-btn:hover {
  opacity: 0.8;
}

.setting-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.setting-select:focus {
  outline: none;
  border-color: transparent;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: #000000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #414141;
}

/* 动画效果 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-toggle {
    width: 45px;
    height: 45px;
  }

  .settings-toggle .icon {
    font-size: 20px;
  }
}
</style>
