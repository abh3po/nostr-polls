import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { TextWithImages } from "../Common/TextWithImages";

interface SingleChoiceOptionsProps {
  options: Array<[string, string, string]>;
  response: string[];
  handleResponseChange: (value: string) => void;
}

export const SingleChoiceOptions: React.FC<SingleChoiceOptionsProps> = ({
  options,
  response,
  handleResponseChange,
}) => (
  <RadioGroup
    value={response}
    defaultValue={response}
    onChange={(e) => handleResponseChange(e.target.value)}
  >
    {options.map((option) => (
      <FormControlLabel
        key={option[1]}
        value={option[1]}
        control={<Radio />}
        label={<TextWithImages content={option[2]} />}
      />
    ))}
  </RadioGroup>
);
