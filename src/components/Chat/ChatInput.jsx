// src/components/Chat/ChatInput.jsx - Friendly UI Version
import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, isLoading = false, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const textareaRef = useRef(null);

  // Handle input change with safety checks
  const handleInputChange = (e) => {
    if (e && e.target && typeof e.target.value === 'string') {
      setMessage(e.target.value);
    }
  };

  // Handle send message with validation
  const handleSend = () => {
    // Safety checks
    if (!message || typeof message !== 'string') {
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    if (isLoading || disabled) {
      return;
    }

    // Call parent handler
    if (onSendMessage && typeof onSendMessage === 'function') {
      onSendMessage(trimmedMessage);
      setMessage(''); // Clear input after sending
      setShowQuickActions(true); // Show quick actions again after sending
    }
  };

  // Handle key press with safety checks
  const handleKeyPress = (e) => {
    if (!e) return;

    // Check for Enter key (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle Ctrl+Enter to add new line
  const handleKeyDown = (e) => {
    if (!e) return;

    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      setMessage(prev => (prev || '') + '\n');
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    handleInputChange(e);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }

    // Hide quick actions when typing
    if (e.target.value && showQuickActions) {
      setShowQuickActions(false);
    } else if (!e.target.value && !showQuickActions) {
      setShowQuickActions(true);
    }
  };



  const handleQuickAction = (actionText) => {
    if (isLoading || disabled) return;

    if (onSendMessage && typeof onSendMessage === 'function') {
      onSendMessage(actionText);
      setShowQuickActions(false);
    }
  };

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Character count color
  const getCharCountColor = () => {
    const length = message?.length || 0;
    if (length > 800) return 'text-red-500';
    if (length > 600) return 'text-yellow-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Simple Quick Actions */}
      {showQuickActions && !message && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('แสดงสถิติรวม')}
              disabled={isLoading || disabled}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 transition-colors disabled:opacity-50"
            >
              <span className="mr-1">📊</span>
              สถิติ
            </button>
            <button
              onClick={() => handleQuickAction('ตรวจสอบความปลอดภัย')}
              disabled={isLoading || disabled}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-full border border-red-200 transition-colors disabled:opacity-50"
            >
              <span className="mr-1">🔒</span>
              ความปลอดภัย
            </button>
            <button
              onClick={() => handleQuickAction('วิเคราะห์แนวโน้ม')}
              disabled={isLoading || disabled}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-full border border-green-200 transition-colors disabled:opacity-50"
            >
              <span className="mr-1">📈</span>
              แนวโน้ม
            </button>
            <button
              onClick={() => handleQuickAction('สร้างรายงาน')}
              disabled={isLoading || disabled}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full border border-purple-200 transition-colors disabled:opacity-50"
            >
              <span className="mr-1">📋</span>
              รายงาน
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message || ''}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              disabled
                ? 'ไม่สามารถส่งข้อความได้ในขณะนี้'
                : isLoading
                  ? 'AI กำลังตอب...'
                  : 'พิมพ์คำถามที่นี่... (Enter เพื่อส่ง)'
            }
            disabled={isLoading || disabled}
            className={`w-full px-4 py-3 border-2 rounded-xl resize-none focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[52px] max-h-[120px] ${isFocused
                ? 'border-blue-400 bg-blue-50/30'
                : 'border-gray-200 hover:border-gray-300'
              }`}
            rows={1}
          />

          {/* Character count */}
          {message && (
            <div className={`absolute bottom-2 right-3 text-xs ${getCharCountColor()}`}>
              {message.length}/1000
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message?.trim() || isLoading || disabled}
          className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${!message?.trim() || isLoading || disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md'
            }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isLoading ? 'ส่ง...' : 'ส่ง'}
          </span>
        </button>
      </div>

      {/* Simple Tips */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        💡 ลองพิมพ์ "ช่วย" เพื่อดูคำสั่งทั้งหมด
      </div>
    </div>
  );
};

export default ChatInput;