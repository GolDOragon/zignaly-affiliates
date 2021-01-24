import React, { useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';
import { appContext } from '../../contexts/app';
import Captcha, { resetCaptchas } from '../../common/molecules/Captcha';
import { setFormErrors } from '../../util/form';
import Input from '../../common/molecules/Input';
import Button from '../../common/atoms/Button';

const ContactUser = ({ user: recipient }) => {
  const { api } = useContext(appContext);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { handleSubmit, register, errors, setError, setValue } = useForm();
  useEffect(() => {
    register({ name: 'captcha' }, { required: 'You must pass the challenge' });
  });

  const onSubmit = async values => {
    setLoading(true);
    try {
      await api.post(`user/email/${recipient._id}`, values);
      setSent(true);
    } catch (error) {
      resetCaptchas();
      setFormErrors(error, setError);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        type="textarea"
        name="text"
        placeholder="Your message"
        title={`Write ${recipient.name} an email`}
        error={errors.text}
        rows={10}
        ref={register({
          required: 'Required',
          pattern: {
            value: v => v.length < 50,
            message: 'You should write at least 50 characters',
          },
        })}
      />

      <Input
        type="checkbox"
        name="consent"
        title="I understand that I need to be polite"
        error={errors.consent}
        ref={register({ required: 'Don\t you want to be polite?' })}
      />

      <Input
        type="checkbox"
        error={errors.privacy}
        name="privacy"
        title="I understand that Zignaly will have access to my message"
        ref={register({ required: 'Required' })}
      />

      <Input
        type="checkbox"
        error={errors.email}
        name="email"
        title={`I understand that ${recipient.name} will see my email address`}
        ref={register({
          required: "Don't you want to hear back from them?",
        })}
      />

      <Captcha
        error={errors.captcha}
        onChange={token => setValue('captcha', token)}
      />

      <Button primary type="submit" disabled={sent} isLoading={loading}>
        {sent ? 'Sent!' : loading ? 'Sending...' : 'Send'}
      </Button>
    </form>
  );
};

export default ContactUser;

ContactUser.propTypes = {
  user: PropTypes.object,
};
