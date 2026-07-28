import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

function EditMessage({ initialText, onSave, onCancel }) {
  const [editText, setEditText] = useState(initialText || '');

  return (
    <div className="edit-message-container">
      <input
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(editText);
          if (e.key === 'Escape') onCancel();
        }}
        className="edit-message-input"
        autoFocus
      />
      <div className="edit-message-actions">
        <button
          className="edit-btn save"
          onClick={() => onSave(editText)}
          title="Save changes"
        >
          <Check size={14} /> Save
        </button>
        <button
          className="edit-btn cancel"
          onClick={onCancel}
          title="Cancel editing"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default EditMessage;
