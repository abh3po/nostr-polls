import React from 'react';
import { Card, CardContent, TextField, Button, CardActions, IconButton } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Option } from "../../interfaces"
 
interface OptionsCardProps {
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onEditOptions: (newOptions: Option[]) => void;
  options: Option[]
}

const OptionsCard: React.FC<OptionsCardProps> = ({
  onAddOption,
  onRemoveOption,
  onEditOptions,
  options,
}) => {
  const handleEditOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index][1] = value;
    onEditOptions(newOptions);
  };

  return (
    <Card variant="outlined">
      {options.length > 0 && (
        <CardContent sx={{ pb: 0 }}>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <TextField
                label={`Option ${index + 1}`}
                fullWidth
                multiline
                value={option[1]}
                onChange={(e) => handleEditOption(index, e.target.value)}
                sx={{ mr: 1 }}
              />
              <IconButton
                color="error"
                onClick={() => onRemoveOption(index)}
              >
                <Delete />
              </IconButton>
            </div>
          ))}
        </CardContent>
      )}
      <CardActions sx={{ pt: 2, pb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddOption}
        >
          Add Option
        </Button>
      </CardActions>
    </Card>
  );
};

export default OptionsCard;
