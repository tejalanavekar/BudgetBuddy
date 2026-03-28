import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateExpense, getExpenses } from '../api/services/expenseService';
import { useAuth } from '../context/AuthContext';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import '../styles/expense.css';

const CATEGORIES = ['Food','Transport','Utilities','Entertainment','Health','Education','Shopping','Travel','Savings','Other'];

const EditExpensePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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
        if (expense.receiptPath) setPreview(`/uploads/${expense.receiptPath}`);
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
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (receipt) formData.append('receipt', receipt);
      await updateExpense(id, formData);
      setMessage({ type: 'success', text: 'Expense updated successfully!' });
      setTimeout(() => navigate('/home'), 1200);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to update expense.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add clear receipt function for removing preview
  const clearReceipt = () => {
    setPreview(null);
    setReceipt(null);
    setMessage({ ...message, text: '' });
  };

  return (
    <div className="expense-main-content">
      <div className="expense-form-wrapper">
        <div className="form-header text-center mb-4">
          <h2 className="display-6 fw-bold text-dark">Edit Expense</h2>
          <p className="text-muted">Update your expense details below</p>
        </div>
        <Form onSubmit={handleSubmit} className="modern-form">
          <Row className="g-4">
            <Col lg={preview ? 7 : 12}>
              {/* Upload Receipt */}
              <Form.Group className="mb-4">
                <Form.Label className="form-label-custom">Upload Receipt</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input-custom file-input"
                />
              </Form.Group>

              {/* Description */}
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Description</Form.Label>
                <Form.Control
                  className="input-custom"
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              {/* Amount + Date */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Amount</Form.Label>
                    <Form.Control
                      className="input-custom"
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Date</Form.Label>
                    <Form.Control
                      className="input-custom"
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Category */}
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Category</Form.Label>
                <Form.Select
                  className="input-custom"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Button
                className="btn-primary-custom w-100 mt-3"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Col>

            {/* Receipt Preview on the right, matching Add Expense */}
            {preview && (
              <Col lg={5} className="edit-expense-preview-col border-start ps-lg-4">
                <span className="form-label-custom mb-2">Receipt Preview</span>
                <div className="receipt-preview-container">
                  <img src={preview} alt="Receipt" className="img-preview" />
                  <button type="button" className="remove-btn" onClick={clearReceipt}>✕</button>
                </div>
              </Col>
            )}
          </Row>
        </Form>
        {message.text && (
          <Alert variant={message.type} className="mt-4 border-0 shadow-sm">
            {message.text}
          </Alert>
        )}
      </div>
    </div>
  );
};

export default EditExpensePage;