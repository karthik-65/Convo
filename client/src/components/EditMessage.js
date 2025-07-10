import React, { useState } from 'react';

function EditMessage({ initialText, onSave, onCancel }) {
  const [editText, setEditText] = useState(initialText || '');

  return (
    <div>
      <input
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        style={{ width: '100%', padding: '6px', borderRadius: '4px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={() => onSave(editText)}
          style={{
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditMessage;
