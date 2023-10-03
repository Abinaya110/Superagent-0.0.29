"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Stack,
  Tag,
  Table,
  Textarea,
  Thead,
  Tbody,
  Th,
  Tr,
  Text,
  useDisclosure,
  FormHelperText,
  FormErrorMessage,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { TbPlus, TbInfoCircle } from "react-icons/tb";
import { useForm } from "react-hook-form";
import API from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { getPromptVariables, DEFAULT_PROMPT } from "@/lib/prompts";
import PromptRow from "./_components/row";

export default function PromptsClientPage({ data, session }) {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const [selectedPrompt, setSelectedPrompt] = useState();
  const router = useRouter();
  const api = new API(session);
  const {
    formState: { isSubmitting, errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm({
    values: {
      template: DEFAULT_PROMPT,
    },
  });

  const template = watch("template");

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      input_variables: getPromptVariables(values.template) || [],
    };

    if (selectedPrompt) {
      await api.patchPrompt(selectedPrompt, payload);

      if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
        analytics.track("Updated Prompt", { ...payload });
      }
    } else {
      await api.createPrompt(payload);
      if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
        analytics.track("Created Prompt", { ...payload });
      }
    }

    router.refresh();
    reset();
    setSelectedPrompt();
    onClose();
  };

  const handleDelete = async (id) => {
    await api.deletePrompt({ id });

    if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
      analytics.track("Deleted Prompt", { id });
    }

    router.refresh();
  };

  const handleEdit = async (promptId) => {
    const prompt = data.find(({ id }) => id === promptId);

    setSelectedPrompt(promptId);
    setValue("name", prompt?.name);
    setValue("template", prompt?.template);
    onOpen();
  };

  return (
    <Stack flex={1} paddingX={12} paddingY={12} spacing={6}>
      <HStack justifyContent="space-between">
        <Stack>
          <Heading as="h1" fontSize="2xl">
            Prompts
          </Heading>
          <Text color="gray.400">
            A prompt is piece of text that gives context to the LLM. It can
            contain instructions on how the Agent should act.
          </Text>
        </Stack>
        <Button
          leftIcon={<Icon as={TbPlus} />}
          alignSelf="flex-start"
          onClick={onOpen}
        >
          New prompt
        </Button>
      </HStack>
      <Stack spacing={4}>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Inputs</Th>
              <Th>&nbsp;</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data?.map(({ id, name, input_variables }) => (
              <PromptRow
                key={id}
                id={id}
                name={name}
                inputVariables={input_variables}
                onDelete={(id) => handleDelete(id)}
                onEdit={(id) => handleEdit(id)}
              />
            ))}
          </Tbody>
        </Table>
      </Stack>
      <Modal
        isOpen={isOpen}
        size="xl"
        onClose={() => {
          reset();
          onClose();
        }}
      >
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>
            {selectedPrompt ? "Edit prompt" : "New prompt"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Alert status="error">
                <HStack alignItems="flex-start">
                  <Icon as={TbInfoCircle} marginTop={1} />
                  <Text>
                    Make sure to include the {`{chat_history}`} input variable
                    if you want the agent to have a memory of past queries.
                  </Text>
                </HStack>
              </Alert>
              <Stack>
                <FormControl isRequired isInvalid={errors?.name}>
                  <FormLabel>Name</FormLabel>
                  <Input
                    type="text"
                    {...register("name", { required: true })}
                  />
                  <FormHelperText>A document name.</FormHelperText>
                  {errors?.name && (
                    <FormErrorMessage>Invalid name</FormErrorMessage>
                  )}
                </FormControl>
                <FormControl isRequired isInvalid={errors?.template}>
                  <FormLabel>Prompt template</FormLabel>
                  <Textarea
                    minHeight="300px"
                    placeholder="You are an AI assistant"
                    {...register("template", { required: true })}
                  />
                  <FormHelperText>
                    Input variables can be defined by using handlebars, ex:{" "}
                    <Tag size="sm">{`{human_input}`}</Tag>
                  </FormHelperText>
                  {errors?.template && (
                    <FormErrorMessage>Invalid template</FormErrorMessage>
                  )}
                </FormControl>
                <FormControl>
                  <FormLabel>Input variables</FormLabel>
                  <HStack>
                    {getPromptVariables(template).map((variable) => (
                      <Tag key={variable}>{variable}</Tag>
                    ))}
                  </HStack>
                </FormControl>
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedPrompt ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
