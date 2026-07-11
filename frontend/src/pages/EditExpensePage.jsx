import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { updateExpense, getExpenses } from '../api/services/expenseService';
import { useAuth } from '../context/AuthContext';
import { Row, Col } from 'react-bootstrap';
import '../styles/expense.css';
import '../styles/editExpensePage.css';
import { UploadIcon, CheckIcon, WarningIcon } from '../components/icons/Icon';

const CATEGORIES = ['Food','Transport','Utilities','Entertainment','Health','Education','Shopping','Travel','Savings','Other'];

const EditExpensePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const selectedMonth = params.get('month');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });
  const [receipt, setReceipt] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.userId) return;
    getExpenses(user.userId).then(res => {
      const expense = res.data.find(e => e._id === id);
      if (expense) {
        setForm({
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date ? expense.date.slice(0, 10) : '',
        });
        if (expense.receiptPath) setPreview(`http://localhost:5000/uploads/${expense.receiptPath}`);
      }
    });
  }, [id, user]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = e => {
    setReceipt(e.target.files[0]);
    setPreview(URL.createObjectURL(e.target.files[0]));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      // Always send amount as string/number, and date as string
      formData.append('description', form.description);
      formData.append('amount', String(form.amount));
      formData.append('category', form.category);
      formData.append('date', form.date);
      if (receipt) formData.append('receipt', receipt);

      // Debug: log FormData contents
      for (let pair of formData.entries()) {
        console.log(pair[0]+ ':', pair[1]);
      }

      await updateExpense(id, formData);
      setMessage({ type: 'success', text: 'Expense updated successfully!' });
      // No auto-navigation after save
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to update expense.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearReceipt = () => {
    setPreview(null);
    setReceipt(null);
    setMessage({ ...message, text: '' });
  };

  return (
    <div className="expense-bg">
      <div className="expense-center-wrapper">
        <div className="expense-main-content">

          <button className="back-btn" onClick={() => navigate(`/home/dashboard${selectedMonth ? `?month=${selectedMonth}` : ''}`)}>← Back</button>

          <div className="expense-form-wrapper">

            {/* Header */}
            <div className="eem-header" style={{ borderRadius: '12px 12px 0 0', margin: '-40px -40px 28px -40px' }}>
              <div>
                <h3 className="eem-title">Edit Expense</h3>
                <p className="eem-subtitle">Update your expense details below</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <Row className="g-4">
                <Col lg={preview ? 7 : 12}>

                  {/* Upload Receipt */}
                  <div className="eem-field mb-3">
                    <label className="eem-label">Upload Receipt</label>
                    <label className="eem-file-label">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <span className="eem-file-btn">
                        <UploadIcon size={16} /> {preview ? 'Replace Receipt' : 'Choose File'}
                      </span>
                    </label>
                  </div>

                  {/* Description */}
                  <div className="eem-field mb-3">
                    <label className="eem-label">Description</label>
                    <input
                      className="eem-input"
                      type="text"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="e.g. JH Bazaar"
                      required
                    />
                  </div>

                  {/* Amount + Date */}
                  <div className="eem-row mb-3">
                    <div className="eem-field">
                      <label className="eem-label">Amount</label>
                      <input
                        className="eem-input"
                        type="number"
                        name="amount"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="eem-field">
                      <label className="eem-label">Date</label>
                      <input
                        className="eem-input"
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="eem-field mb-4">
                    <label className="eem-label">Category</label>
                    <select
                      className="eem-input eem-select"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit */}
                  <button
                    className="eem-btn-save w-100"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? <span className="eem-saving"><span className="eem-spinner" /> Saving...</span>
                      : 'Save Changes'}
                  </button>

                </Col>

                {/* Receipt Preview */}
                {preview && (
                  <Col lg={5} className="edit-expense-preview-col border-start ps-lg-4">
                    <div className="eem-field">
                      <label className="eem-label">Receipt Preview</label>
                      <div className="eem-new-preview" style={{ flexDirection: 'column', alignItems: 'center', padding: '1rem' }}>
                        <img
                          src={preview}
                          alt="Receipt"
                          style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '10px', marginBottom: '0.75rem' }}
                          onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                        />
                        <button type="button" className="eem-remove-receipt" onClick={clearReceipt}>
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </Col>
                )}

              </Row>
            </form>

            {/* Message */}
            {message.text && (
              <div
                className="eem-error mt-3"
                style={{
                  color: message.type === 'success' ? '#1a7a4a' : '#c62828',
                  background: message.type === 'success' ? '#e6f9f0' : '#fdecea',
                  borderRadius: '10px',
                  marginTop: '1rem'
                }}
              >
                {message.type === 'success' ? <CheckIcon size={14} /> : <WarningIcon size={14} />} {message.text}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EditExpensePage;