"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Stack,
  Spinner,
  Text,
  useToast,
  useDisclosure,
  Textarea,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { TbPlayerPlay, TbPlus, TbRefresh, TbX } from "react-icons/tb";
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonLanguage } from "@codemirror/lang-json";
import { languages } from "@codemirror/language-data";
import { githubDark } from "@uiw/codemirror-theme-github";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import { BeatLoader } from "react-spinners";
import { useAsyncFn } from "react-use";
import { TOOL_ICONS } from "@/lib/constants";
import API from "@/lib/api";
import AgentNavbar from "./_components/nav";
import DocumentPickerModal from "@/app/documents/document-picker";
import ToolPickerModal from "@/app/tools/tool-picker";
import { getPromptVariables } from "@/lib/prompts";

function Panel({ children }) {
  return (
    <Stack
      flex={1}
      borderRight="1px"
      borderColor="#333"
      maxWidth="33.333%"
      spacing={0}
    >
      {children}
    </Stack>
  );
}

function PanelHeading({ title, isLoading, onCreate, onUpdate, isUpdating }) {
  return (
    <HStack
      borderBottom="1px"
      borderColor="#333"
      paddingLeft={6}
      paddingRight={3}
      paddingY={2}
      justifyContent="space-between"
    >
      <Text fontSize="xs" textTransform="uppercase">
        {title}
      </Text>
      {isLoading && <BeatLoader color="white" size={7} />}
      {onCreate && (
        <Button size="xs" leftIcon={<Icon as={TbPlus} />} onClick={onCreate}>
          Add
        </Button>
      )}
      {onUpdate && (
        <Button
          size="xs"
          leftIcon={<Icon as={TbRefresh} />}
          onClick={onUpdate}
          isLoading={isUpdating}
        >
          Update
        </Button>
      )}
    </HStack>
  );
}

function AgentDocument({ session, id, document }) {
  const api = new API(session);
  const router = useRouter();
  const toast = useToast();
  const [{ loading: isDeletingDocument }, handleDeleteDocument] = useAsyncFn(
    async (id) => {
      await api.deleteAgentDocument({ id });

      toast({
        description: "Document removed",
        position: "top",
        colorScheme: "gray",
      });
      router.refresh();
    },
    [router, toast]
  );

  return (
    <HStack
      key={id}
      backgroundColor="#222"
      justifyContent="space-between"
      borderRadius="md"
      borderWidth="0.5px"
      paddingY={2}
      paddingX={4}
      spacing={4}
    >
      <Text fontSize="sm">{document?.name}</Text>
      <IconButton
        size="xs"
        icon={isDeletingDocument ? <Spinner size="xs" /> : <Icon as={TbX} />}
        onClick={() => handleDeleteDocument(id)}
      />
    </HStack>
  );
}

function AgentTool({ id, tool, session }) {
  const api = new API(session);
  const router = useRouter();
  const toast = useToast();
  const [{ loading: isDeletingTool }, handleDeleteTool] = useAsyncFn(
    async (id) => {
      await api.deleteAgentTool({ id });

      toast({
        description: "Tool removed",
        position: "top",
        colorScheme: "gray",
      });
      router.refresh();
    },
    [router, toast]
  );

  return (
    <HStack
      key={id}
      backgroundColor="#222"
      justifyContent="space-between"
      borderRadius="md"
      borderWidth="0.5px"
      paddingY={2}
      paddingX={4}
    >
      <Avatar src={TOOL_ICONS[tool?.type]} size="xs" borderRadius="none" />
      <Text fontSize="sm">{tool?.name}</Text>
      <IconButton
        size="xs"
        icon={isDeletingTool ? <Spinner size="xs" /> : <Icon as={TbX} />}
        onClick={() => handleDeleteTool(id)}
      />
    </HStack>
  );
}

export default function AgentDetailClientPage({
  id,
  apiTokens,
  agent,
  documents,
  tools,
  session,
}) {
  const [prompt, setPrompt] = useState();
  const api = new API(session);
  const toast = useToast();
  const router = useRouter();
  const {
    isOpen: isToolModalOpen,
    onClose: onToolModalClose,
    onOpen: onToolModalOpen,
  } = useDisclosure();
  const {
    isOpen: isDocumentModalOpen,
    onClose: onDocumentModalClose,
    onOpen: onDocumentModalOpen,
  } = useDisclosure();
  const [message, setMessage] = useState(null);
  const [response, setResponse] = useState(null);
  const {
    formState: { isSubmitting, errors },
    handleSubmit,
    register,
  } = useForm();
  const [{ loading: isUpdatingPrompt }, updatePrompt] = useAsyncFn(async () => {
    await api.patchPrompt(agent.promptId, {
      template: prompt,
      input_variables: getPromptVariables(prompt) || [],
    });

    toast({
      description: "Updated prompt",
      position: "top",
      colorScheme: "gray",
    });
    router.refresh();
  }, [agent, toast, router, api]);

  const onSubmit = async ({ input }) => {
    setResponse();
    setMessage(message);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPERAGENT_API_URL}/agents/${id}/predict`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          X_SUPERAGENT_API_KEY: apiTokens[0]?.token,
        },
        body: JSON.stringify({
          input: { input },
          has_streaming: false,
        }),
      }
    );

    const prediction = await response.json();

    setResponse(prediction);
  };

  const onCreateTool = async (values) => {
    await api.createAgentTool({
      agentId: id,
      ...values,
    });

    toast({
      description: "Tool added",
      position: "top",
      colorScheme: "gray",
    });
    onToolModalClose();
    router.refresh();
  };

  const onCreateDocument = async (values) => {
    await api.createAgentDocument({
      agentId: id,
      ...values,
    });

    toast({
      description: "Document added",
      position: "top",
      colorScheme: "gray",
    });
    onDocumentModalClose();
    router.refresh();
  };

  return (
    <Stack spacing={0} flex={1}>
      <AgentNavbar agent={agent} hasApiTokenWarning={!apiTokens} />
      <HStack
        padding={6}
        justifyContent="space-between"
        as="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Stack flex={1}>
          <Text fontSize="md" fontWeight="bold" color="green.500">
            Input
          </Text>
          <FormControl>
            <Input
              type="text"
              variant="unstyled"
              placeholder="Type your input hit and hit run..."
              {...register("input", { required: true })}
            />
          </FormControl>
        </Stack>
        <Button
          type="submit"
          isDisabled={!apiTokens}
          isLoading={isSubmitting}
          loadingText="RUNNING..."
          fontFamily="mono"
          leftIcon={<Icon as={TbPlayerPlay} />}
        >
          RUN
        </Button>
      </HStack>
      <Divider />
      <HStack flex={1} alignItems="stretch" spacing={0}>
        <Panel>
          <PanelHeading title="Output" isLoading={isSubmitting} />
          {!isSubmitting && response?.data && (
            <Box
              paddingX={6}
              paddingY={4}
              __css={{ code: { textWrap: "balance" } }}
              fontSize="sm"
            >
              <ReactMarkdown>
                {"```\n" + response?.data + "\n```"}
              </ReactMarkdown>
            </Box>
          )}
        </Panel>
        <Panel>
          <PanelHeading title="Logs" isLoading={isSubmitting} />
          {!isSubmitting && response && (
            <Stack fontSize="sm" flex={1}>
              <CodeMirror
                editable={false}
                extensions={[
                  json({
                    base: jsonLanguage,
                    codeLanguages: languages,
                  }),
                  EditorView.lineWrapping,
                ]}
                theme={githubDark}
                value={JSON.stringify(response?.trace, null, 2)}
              />
            </Stack>
          )}
        </Panel>
        <Panel>
          <PanelHeading title="Tools" onCreate={onToolModalOpen} />
          <HStack paddingX={6} paddingY={6} flexWrap="wrap" gap={2} spacing={0}>
            {tools.map(({ id, tool }) => (
              <AgentTool key={id} id={id} tool={tool} session={session} />
            ))}
          </HStack>
          <Divider />
          <PanelHeading title="Documents" onCreate={onDocumentModalOpen} />
          <HStack paddingX={6} paddingY={6} flexWrap="wrap" gap={2} spacing={0}>
            {documents.map(({ id, document }) => (
              <AgentDocument
                key={id}
                id={id}
                document={document}
                session={session}
              />
            ))}
          </HStack>
          <Divider />
          {agent?.promptId && (
            <>
              <PanelHeading
                title="Prompt"
                onUpdate={() => updatePrompt()}
                isUpdating={isUpdatingPrompt}
              />
              <HStack paddingX={6} paddingY={6}>
                <HStack
                  backgroundColor="#222"
                  borderRadius="md"
                  borderWidth="0.5px"
                  paddingY={2}
                  paddingX={4}
                  flex={1}
                >
                  <Textarea
                    variant="unstyled"
                    size="sm"
                    onChange={(event) => setPrompt(event.target.value)}
                  >
                    {prompt || agent.prompt.template}
                  </Textarea>
                </HStack>
              </HStack>
              <Divider />
            </>
          )}
          <PanelHeading title="API" />
          <HStack paddingX={6} paddingY={6}>
            <HStack
              backgroundColor="#222"
              justifyContent="space-between"
              borderRadius="md"
              borderWidth="0.5px"
              paddingY={2}
              paddingX={4}
            >
              <Text fontSize="sm">/agents/{id}/predict</Text>
            </HStack>
          </HStack>
          <Divider />
          <PanelHeading title="Language model" />
          <HStack paddingX={6} paddingY={6}>
            <HStack
              key={id}
              backgroundColor="#222"
              justifyContent="space-between"
              borderRadius="md"
              borderWidth="0.5px"
              paddingY={2}
              paddingX={4}
            >
              <Text fontSize="sm">{agent.llm.model}</Text>
            </HStack>
          </HStack>
        </Panel>
      </HStack>
      <ToolPickerModal
        onSubmit={(values) => onCreateTool(values)}
        onOpen={onToolModalOpen}
        onClose={onToolModalClose}
        isOpen={isToolModalOpen}
        session={session}
      />
      <DocumentPickerModal
        onSubmit={(values) => onCreateDocument(values)}
        onOpen={onDocumentModalOpen}
        onClose={onDocumentModalClose}
        isOpen={isDocumentModalOpen}
        session={session}
      />
    </Stack>
  );
}
